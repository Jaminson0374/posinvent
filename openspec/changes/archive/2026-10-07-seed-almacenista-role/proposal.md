# Propuesta: Sembrar rol ALMACENISTA y corregir VENDEDOR→CAJERO (Hallazgo C3)

## Intención

`V1__create_roles.sql` siembra solo `ADMIN, CAJERO, CARNICERO, AUXILIAR, CONTADOR`, pero 7 controladores anotan `@PreAuthorize("hasAnyRole('ADMIN','ALMACENISTA')")` (16 referencias) y `PosController` usa `VENDEDOR` (2 endpoints) — un rol que no existe en la tabla RBAC. El modelo autoriza por **nombre de rol** (`hasAnyRole`), no por permiso, así que un rol ausente en BD se resuelve en 403. Efecto: los endpoints de inventario/logística/producción solo autorizan `ADMIN` en la práctica; el personal de bodega y ventas no puede operar.

## Alcance

### Slice 1 — Backend: sembrar ALMACENISTA + corregir VENDEDOR

- Migración Flyway `V109__seed_almacenista_role.sql` (continúa tras V108):

  ```sql
  INSERT INTO roles (name, permissions) VALUES
      ('ALMACENISTA', '["inventory.*","production.*","logistics.*"]');
  ```

- `PosController.java`: reemplazar `VENDEDOR` → `CAJERO` en líneas 56 y 66 (POST/GET `/devolutions`). Es el único `VENDEDOR` de todo el repo (backend, frontend y tests) — cambio de 2 líneas.

### Slice 2 — Alineación RBAC (frontend + documentación)

- Frontend: agregar `'ALMACENISTA'` al union `UserRole` (`core/models/user.model.ts:1`), al filtro de roles (`admin/users/user-list.ts:49-54`) y a los módulos de inventario/logística/producción del menú (`layout/shell/shell.ts:60`).
- Documentación: actualizar la tabla RBAC de `.ai_context/6-sdd_user_management.md` §2 — fila `ALMACENISTA` + nota `VENDEDOR`→`CAJERO`.

### Qué cambia en resumen

- Nuevo rol `ALMACENISTA` (el "bodeguero" de `0-Interfaces.md` §8) sembrado con `inventory.*`, `production.*`, `logistics.*`.
- `VENDEDOR` eliminado → `CAJERO`.
- Frontend tipa, filtra y muestra el nuevo rol.

## Decisión de permisos ALMACENISTA

| Permiso | Sí/No | Justificación |
| --- | --- | --- |
| `inventory.*` | ✅ | StockController (entry/exit), AdjustmentController, KardexController |
| `production.*` | ✅ | ProductionOrderController, MachineryController |
| `logistics.*` | ✅ | TransferController, DisposalController |
| `reports.*` | ❌ | Propiedad de CONTADOR; espeja el bloqueo de CARNICERO |
| `finance.*` | ❌ | Nunca para rol operativo de bodega |
| `sales.*` | ❌ | Espeja el bloqueo de CARNICERO |

## Capacidades

- **Nueva**: Ninguna — cambio de implementación/configuración; no introduce spec-level openspec.
- **Modificada**: Ninguna. La tabla RBAC vive en `.ai_context/6-sdd_user_management.md` (contrato de proyecto), no en `openspec/specs/`.

## Fuera de alcance (no-objetivos)

- Formalizar RBAC como capability openspec nueva (decisión aparte).
- Migrar la autorización de `hasAnyRole` (nombre) a `hasAuthority` (permiso).
- Crear usuarios de prueba con rol ALMACENISTA.
- Reordenar la jerarquía de permisos existente.

## Impacto

| Área | Archivos | Descripción |
| --- | --- | --- |
| Migraciones Flyway | 1 nueva | `V109__seed_almacenista_role.sql` |
| Backend | 1 modificado | `PosController.java` (2 líneas) |
| Frontend | 3 modificados | `user.model.ts`, `user-list.ts`, `shell.ts` |
| Docs | 1 modificado | `.ai_context/6-sdd_user_management.md` §2 |

## Dependencias

- ✅ Roles sembrados vía Flyway (precedente `V1__create_roles.sql`).
- ✅ Autorización por nombre de rol (sin enum Java); no hay que tocar `SecurityConfig`.
- ✅ `RoleService.listAll()` y `user-form.ts` cargan roles dinámicamente (no hardcodean).
- ⚠️ `UserRole` union del frontend es compile-time; debe ampliarse o `tsc --noEmit` falla al tipar `ALMACENISTA`.

## Riesgos y preguntas abiertas

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Migración re-ejecutable falla por UNIQUE en `roles.name` si el rol ya existe | Baja | `INSERT` idempotente vía `ON CONFLICT (name) DO NOTHING` |
| `VENDEDOR`→`CAJERO` amplía el acceso de `/devolutions` a todo cajero (no solo vendedores) | Media | Es la intención aprobada; documentar en §2 |
| Menú shell.ts ampliado expone módulos no deseados a bodegueros | Media | Definir subconjunto exacto en design.md |

### Preguntas abiertas para `design.md`

1. **Permisos finos de `logistics.*`**: ¿otorgar `logistics.*` completo (incluye `dispose`) o granular (`logistics.transfer`, `logistics.dispose`)? Hoy el enforcement es por nombre de rol, así que el JSONB es metadata/documentación — confirmar si debe reflejar granularidad real.
2. **Alcance del menú frontend**: ¿`shell.ts` expone a ALMACENISTA todos los módulos de inventario/logística/producción, o solo un subconjunto (sin administración)?
3. **Formalizar RBAC**: ¿se eleva RBAC a capability openspec ahora, o se mantiene como contrato `.ai_context`?

## Rollback

- Revertir `V109`: el rol extra no rompe nada; los endpoints vuelven a `ADMIN`-only sin pérdida de datos.
- Revertir `PosController`: restaura `VENDEDOR`, pero deja el bug C3 latente — se prefiere conservar el fix.

## Criterios de éxito

- [ ] `V109` aplica sin error; `SELECT name FROM roles` incluye `ALMACENISTA`.
- [ ] `grep VENDEDOR` en `backend_pos-vta` = 0 coincidencias.
- [ ] `POST/GET /devolutions` autorizan `CAJERO`.
- [ ] `tsc --noEmit` en `posinvent` sin errores (union ampliado).
