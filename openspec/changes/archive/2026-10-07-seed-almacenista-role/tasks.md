# Tasks: Sembrar rol ALMACENISTA y corregir VENDEDOR→CAJERO (Hallazgo C3)

## Review Workload Forecast

| Campo                      | Valor                                                       |
| -------------------------- | ----------------------------------------------------------- |
| Líneas cambiadas estimadas | Slice 1: ~6 (4 SQL + 2 Java) · Slice 2: ~7 (frontend + doc) |
| ¿Excede 400 líneas?        | No (total ~13)                                              |
| 400-line budget risk       | Low                                                         |
| Chained PRs recommended    | No                                                          |
| Delivery strategy          | auto-chain                                                  |
| Suggested split            | PR único (no requiere encadenado)                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

> Matriz de amenazas: `N/A` (design). Sin tareas RED test. Verificación por compilación/grep/vitest.

## Phase 1: Backend — Slice 1 (repo `C:\POS_VTA\backend_pos-vta`)

- [x] 1.1 [backend] Crear `src/main/resources/db/migration/V109__seed_almacenista_role.sql` con el INSERT idempotente del design: `('ALMACENISTA', '["inventory.*","production.*","logistics.*"]') ON CONFLICT (name) DO NOTHING`. Aceptación: SQL PostgreSQL válido, continua tras V108, sin constraint nueva.
- [x] 1.2 [backend] Editar `src/main/java/co/posinvent/infrastructure/adapters/in/rest/PosController.java`: reemplazar `'VENDEDOR'`→`'CAJERO'` en `@PreAuthorize` de POST y GET `/devolutions` (líneas 56 y 66). Aceptación: `gradlew compileJava` OK.
- [x] 1.3 [backend] Verificar Slice 1: `gradlew compileJava` exitoso y `grep -R VENDEDOR` en `backend_pos-vta` = 0 coincidencias.

## Phase 2: Frontend + Documentación — Slice 2 (repo `C:\POS_VTA\posinvent` + workspace `.ai_context`)

- [x] 2.1 [frontend] Ampliar union `UserRole` en `src/app/core/models/user.model.ts` (línea 1) con `'ALMACENISTA'`. Aceptación: `npx tsc --noEmit` = 0 errores.
- [x] 2.2 [frontend] Agregar `{ value:'ALMACENISTA', label:'ALMACENISTA' }` a `roleOptions` en `src/app/features/admin/users/user-list.ts`.
- [x] 2.3 [frontend] Agregar `ALMACENISTA` al array `roles` de módulos `inventario` y `logistica` en `src/app/layout/shell/shell.ts`. NO agregar a `administracion`/`compras`/`contabilidad`. Aceptación: matriz del design cumplida (Producción cubierto por ser hijo de `inventario`).
- [x] 2.4 [doc] Actualizar `C:\POS_VTA\.ai_context\6-sdd_user_management.md` §2 (líneas 20-26): fila `ALMACENISTA` (`inventory.*`, `production.*`, `logistics.*`) + nota `VENDEDOR`→`CAJERO`.
- [x] 2.5 [frontend] Verificar Slice 2: `npx tsc --noEmit` = 0 errores; `npx vitest run` sobre specs existentes (`desposte-manual`, `faena`) pasan.

## Notas para apply

- **Dos repos + un archivo workspace**: Slice 1 vive en `backend_pos-vta`; Slice 2 en `posinvent`; el contrato RBAC está en `C:\POS_VTA\.ai_context\6-sdd_user_management.md` (raíz del workspace, NO dentro de `posinvent/` ni `backend_pos-vta/`).
- La tabla §2 actual NO lista `VENDEDOR`; la nota documenta la corrección realizada en `PosController`, no renombra una fila existente.
- Sin migración de datos. Rollback: revertir `V109` + restaurar `PosController`.
