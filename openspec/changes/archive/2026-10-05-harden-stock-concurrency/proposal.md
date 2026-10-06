# Propuesta: Endurecer control de concurrencia en stock (Hallazgo C1)

## Intención

El módulo de inventario no tiene control de concurrencia. Las 7 entidades de stock/consumo carecen de `@Version`, y los casos de uso hacen read-modify-write sobre `currentQuantity` sin bloqueo ni chequeo de versión. Bajo cientos de usuarios concurrentes (POS, desposte, ajustes, traslados, job de vencimiento) esto produce **lost-update y sobreventa**: dos transacciones leen el mismo stock, ambas descuentan, y una pisotea a la otra. El resto del código ya usa locking optimista (14 entidades con `@Version`, precedente `ObjectOptimisticLockingFailureException` → `BusinessException("CONCURRENT_MODIFICATION")`). Este cambio extiende ese patrón establecido al inventario, eligiendo **reintento** en lugar de fail-fast.

## Alcance

### Slice 1 — Fundación: migraciones + `@Version`

- Migración Flyway: columna `version BIGINT NOT NULL DEFAULT 0` en las 7 tablas.
- Campo `@Version` en las 7 entidades JPA (en `infrastructure/adapters/out/persistence/`):
  `InventoryStockEntity`, `CostLayerEntity`, `BatchEntity`, `InventoryMovementEntity`, `StockAdjustmentEntity`, `StockTransferEntity`, `StockDisposalEntity`.
- No toca `domain` (los records de dominio no portan `@Version`; la versión vive solo en la capa de infraestructura, según contrato hexagonal).

### Slice 2 — Coordinación de reintento

- Reintento de la unidad de trabajo transaccional en los use cases ofensores:
  `ManualStockEntryUseCase`, `ManualStockExitUseCase`, `CreateAdjustmentUseCase`, `CreateTransferUseCase`/`ConfirmTransferUseCase`, `CreateDisposalUseCase`, `ProcessSlaughterUseCase`, `ManualDesposteUseCase`, `CostingService`, `ExpirationMonitorJob`.
- Helper de reintento (p. ej. `@Retryable` o wrapper explícito) que re-lee la entidad fresca, re-aplica el delta y re-ejecuta la transacción completa — garantizando que los efectos secundarios transaccionales (movimientos de kardex) no se dupliquen.
- Abordar el delete-all + re-insert de `CostingService` (inherentemente no idempotente bajo reintento).

### Slice 3 — Pruebas de concurrencia

- Test de integración (Testcontainers + Postgres real): 100 peticiones simultáneas sobre un mismo `InventoryStock`; verificar que el stock final es consistente (sin sobreventa ni pérdida de actualizaciones) y que el reintento converge.

### Qué cambia en resumen

- **7 entidades** ganan `@Version` (control optimista).
- **Use cases** coordinados para reintentar, no fallar, ante conflicto de versión.
- **Mecanismo de reintento** con idempotencia de efectos secundarios.

## Fuera de alcance (no-objetivos)

- **C2** — Control de concurrencia del costeo (más allá del reintento de `CostingService` ya en alcance).
- **C3** — Control de acceso por roles.
- **A1** — Refactor de layering hexagonal (la deuda de `AuthenticateUserUseCase` y otras violaciones).
- **A3** — Transaccionalidad con auto-invocación (`@Transactional` self-invocation).
- `KardexJpaRepository.getCurrentStock()` con `@Lock(PESSIMISTIC_WRITE)` sobre SUM agregado — bug latente documentado, **no se corrige aquí** (no bloquea filas reales; se registra como riesgo, decisión de diseño pendiente).

## Impacto

| Área | Archivos | Descripción |
| --- | --- | --- |
| Migraciones Flyway | ~1 nueva | columna `version` en 7 tablas |
| Entidades JPA | 7 modificadas | agregar `@Version Long version` |
| Use cases (`application/usecase`) | ~9 modificados | reintento ante `OptimisticLockException` |
| Helper de reintento | 1 nuevo | coordinación de reintento transaccional |
| Tests de integración | ~2 nuevos | 100 peticiones simultáneas |

## Dependencias

- ✅ Patrón `@Version` ya establecido (14 entidades existentes).
- ✅ Precedente `ObjectOptimisticLockingFailureException` → `BusinessException("CONCURRENT_MODIFICATION")` en `ThirdPartyRepositoryAdapter.save()`.
- ✅ `InventoryStockEntity` ya tiene `@Table(uniqueConstraints = {product_id, batch_id, warehouse_id})`.
- ✅ Flyway en uso (V22-V36 existentes).
- ⚠️ Hibernate 7: cuidado con "Detached entity version null" al hacer merge (ya documentado en Sprint 5).

## Riesgos y preguntas abiertas

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Reintento duplica efectos secundarios no transaccionales (auditoría MongoDB) | Media | Delimitar explícitamente qué participa de la tx Postgres y qué no |
| Migración de `version` DEFAULT 0 sobre filas existentes en uso | Baja | `BIGINT NOT NULL DEFAULT 0` es aditiva y atómica |
| `CostingService` delete+reinsert no idempotente bajo reintento | Media | Tratar como caso especial (bloqueo o reemplazo atómico) |
| `getCurrentStock()` PESSIMISTIC_WRITE no bloquea filas (bug latente) | Media | Documentar; decidir en diseño si se corrige o se reemplaza por optimista |

### Preguntas abiertas para `design.md`

1. **Retry vs fail-fast y semántica de idempotencia**: ¿dónde vive el límite del reintento (reintentar el use case completo vs. solo la re-lectura)? ¿Cómo garantizar que los movimientos de kardex y el log de auditoría (MongoDB, posiblemente fuera de la tx Postgres) no se apliquen dos veces al reintentar?
2. **Migración de la columna `version`**: ¿`BIGINT NOT NULL DEFAULT 0` es suficiente, o se necesita backfill/consistencia con las filas que ya están siendo leídas-escritas durante el deploy (rolling upgrade)?
3. **`CostingService` delete-all + re-insert**: bajo reintento no es idempotente y es racy. ¿Requiere manejo especial (padre versionado + reemplazo atómico, o bloqueo pesimista puntual), o queda fuera del alcance del `@Version`?

## Rollback

- Revertir migración Flyway (columna `version`) y quitar `@Version`: el sistema vuelve al estado actual sin pérdida funcional.
- El reintento es puramente aditivo sobre use cases existentes; deshacer el helper no altera el flujo feliz.
- Migración aditiva → se puede hacer `flyway undo` o desplegar una migración inversa sin pérdida de datos.

## Criterios de éxito

- [ ] 7 entidades con `@Version` y columna `version` presente en BD.
- [ ] Test de 100 peticiones simultáneas no produce sobreventa ni lost-update.
- [ ] Reintento converge sin duplicar movimientos de kardex ni auditoría.
