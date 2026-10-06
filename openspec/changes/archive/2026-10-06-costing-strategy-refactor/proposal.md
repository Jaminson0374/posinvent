# Propuesta: Refactor de la estrategia de costeo (Hallazgo C2)

## Intención

`CostingService` —el motor de capas de costo PEPS/PROMEDIO— vive en `application/usecase` en lugar de `domain/service`, y NO implementa el patrón Strategy que `0-Interfaces.md §COSTEO` exige. La matemática pura de costeo (promedio ponderado, consumo FIFO/FEFO) está mezclada con preocupaciones de infraestructura: acceso a repositorios (`layerRepo.save` dentro del loop de `consumeFifo`), el lock `PESSIMISTIC_WRITE` de C1, y `@Transactional`. Esto viola la regla hexagonal crítica (`domain` no importa `application`/`infrastructure`) y vuelve el algoritmo imposible de testear sin Spring/JPA.

## Alcance

### Slice 1 — Motor puro de dominio (Strategy Pattern)

- Interfaz `CostingStrategy` en `domain/service` + implementaciones `FifoCostingStrategy` y `WeightedAvgCostingStrategy`.
- Algoritmos puros desacoplados de persistencia:
  - **Promedio ponderado**: `Σ(remainingQty × unitCost) / Σ(remainingQty)` a 6 decimales `HALF_UP`.
  - **Consumo FIFO/FEFO**: iterar capas ordenadas por vencimiento ASC, `min(remaining, layer.remainingQuantity())`, y devolver un `CostConsumptionResult` (lista de mutaciones de capa + costo unitario promedio consumido) **sin** llamar a `layerRepo`.
- Value objects puros (`CostConsumptionResult`, etc.).
- Tests unitarios puros (sin Spring, sin JPA, sin `@Transactional`).

### Slice 2 — Orquestador hexagonal

- Refactor de `CostingService` (application) a orquestador: resuelve la estrategia, lee capas vía repositorio, delega el cálculo puro y aplica el resultado persistido.
- **Preservar** el lock `PESSIMISTIC_WRITE` de C1 (`stockJpaRepository.lockForUpdate`) en el camino de entrada PROMEDIO y mantener `@Transactional` — ambos permanecen en application.
- Desacoplar `consumeFifo`: la mutación `layerRepo.save` sale del algoritmo puro hacia el orquestador.
- El lock y `@Transactional` NO deben filtrarse al dominio.

### Slice 3 — Alineación de selector y naming (condicional a la decisión)

- Unificar la fuente del selector: la spec dice `company_config.costing_method`, el código usa `product.costingMethod()`, y `FormulaProductionUseCase` lee `company_config` con fallback `WEIGHTED_AVERAGE`. Definir una única fuente de verdad.
- Unificar valores: `FIFO`/`WEIGHTED_AVG` (spec) vs `PEPS`/`PROMEDIO_PONDERADO` (+ `ESTANDAR`, `IDENTIFICACION_ESPECIFICA`, `YIELD_COSTING` en `ProductRequest`) vs `WEIGHTED_AVERAGE` (fallback actual).

### Qué cambia en resumen

- Lógica de costeo migra a `domain/service` con Strategy Pattern.
- Infraestructura (repos, lock, `@Transactional`) permanece en application.
- Algoritmo FIFO desacoplado de persistencia.

## Capacidades

- **Nueva**: `costeo-estrategia` — motor de costeo por Strategy Pattern (FIFO + Promedio Ponderado) en `domain/service`, con selector único.
- **Modificada**: `stock-concurrency` — solo renombrar la referencia a `CostingService` en el escenario "delete-all + re-insert" de REQ-CONC-003; la invariante de idempotencia no cambia.

## Fuera de alcance (no-objetivos)

- Reescritura de `YieldCosting` (Desposte) — complementa PEPS, no se toca.
- Cambios en Kardex, journal entries o auditoría MongoDB.
- Bug latente `KardexJpaRepository.getCurrentStock()` `PESSIMISTIC_WRITE` (documentado en C1; no se corrige aquí).

## Impacto

| Área | Archivos | Descripción |
| --- | --- | --- |
| `domain/service` | 3-4 nuevos | `CostingStrategy`, `FifoCostingStrategy`, `WeightedAvgCostingStrategy`, value objects |
| `application/usecase` | 1 modificado | `CostingService` → orquestador |
| Tests unitarios | ~2-3 nuevos | algoritmos puros (promedio, FIFO/FEFO) |

## Dependencias

- ✅ `domain/service` ya aloja lógica pura (`SlaughterDomainService`, `FefoPicker`, `BomExploder`).
- ✅ Lock `PESSIMISTIC_WRITE` de C1 ya en `StockJpaRepository.lockForUpdate`.
- ⚠️ `stock-concurrency` REQ-CONC-003 referencia `CostingService`; preservar invariante de idempotencia.

## Riesgos y preguntas abiertas

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Refactor altera sutilmente el comportamiento numérico (redondeo) | Media | Tests puros de equivalencia contra los resultados actuales |
| Lock de C1 se pierde o se filtra al dominio | Baja | Test/contrato explícito: lock y `@Transactional` solo en application |
| Naming/selector mal alineado rompe `KardexRepositoryAdapter`/`FormulaProductionUseCase` | Media | Resolver decisión en Slice 3 antes de tocar consumidores |

### Preguntas abiertas para design.md

1. **Naming/selector mismatch (crítico)**: ¿alineamos a `company_config.costing_method` con `FIFO`/`WEIGHTED_AVG` (spec), o mantenemos `product.costingMethod()` con `PEPS`/`PROMEDIO_PONDERADO` (código actual)? Son DOS divergencias: la *fuente* (company vs product) y los *valores* (FIFO/WEIGHTED_AVG vs PEPS/PROMEDIO_PONDERADO vs WEIGHTED_AVERAGE). ¿Migración de datos, o mapping de compatibilidad temporal?
2. **Signature de `CostingStrategy`**: la spec declara `calculateUnitCost(StockEntry, ProductInventory)`, pero el motor tiene dos operaciones (entrada → crear/mergear capa; salida → consumir). ¿La interfaz debe exponer `onEntry`/`onExit` (o `calculate` + `consume`) en lugar de un único método?
3. **Preservación exacta del lock**: el lock de PROMEDIO serializa delete-all + re-insert sobre la fila concreta de stock. Al mover el cálculo a dominio, ¿el orquestador mantiene el lock antes de leer capas y antes de persistir, en el mismo orden?

## Rollback

- Refactor sin cambio de esquema: `git revert` del commit restaura `CostingService` original y los algoritmos vuelven al estado actual sin pérdida funcional.
- Los tests unitarios puros son aditivos; su eliminación no altera el flujo feliz.

## Criterios de éxito

- [ ] `CostingStrategy` + `FifoCostingStrategy` + `WeightedAvgCostingStrategy` en `domain/service`, sin imports de `application`/`infrastructure`.
- [ ] Tests unitarios puros de promedio ponderado y consumo FIFO/FEFO pasan sin Spring/JPA.
- [ ] Lock `PESSIMISTIC_WRITE` y `@Transactional` preservados en la capa application.
- [ ] Comportamiento numérico idéntico al actual (mismos `unitCost` a 6 decimales).
