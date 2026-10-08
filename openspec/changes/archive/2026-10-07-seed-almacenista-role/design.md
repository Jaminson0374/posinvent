# Design: Sembrar rol ALMACENISTA y corregir VENDEDOR→CAJERO (Hallazgo C3)

## Enfoque técnico

Cambio de configuración/al implementación, sin capability openspec nueva. El backend autoriza por **nombre de rol** (`hasAnyRole`), no por permiso: el JSONB de `roles.permissions` es metadata/documentación. Se siembra el rol `ALMACENISTA` idempotente vía Flyway `V109`, se corrige `VENDEDOR`→`CAJERO` en `PosController`, y se alinea el frontend (union `UserRole`, filtro, menú) con el contrato RBAC `.ai_context`.

## Decisiones de arquitectura

| Decisión             | Alternativas consideradas                 | Elección                                                        | Racional                                                                                                                                                                                                                            |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idempotencia de V109 | `INSERT … WHERE NOT EXISTS`               | `INSERT … ON CONFLICT (name) DO NOTHING`                        | Atómico y libre de race TOCTOU; `roles.name` ya es `VARCHAR(50) NOT NULL UNIQUE` (V1), así que el target de conflicto existe sin crear constraint nueva. `DO NOTHING` (no `DO UPDATE`) evita pisar permisos de un rol preexistente. |
| Permisos ALMACENISTA | Granular (`logistics.transfer`/`dispose`) | `["inventory.*","production.*","logistics.*"]`                  | `logistics.*` completo incluye dispose/transfer; el JSONB es metadata porque el enforcement es `hasAnyRole`.                                                                                                                        |
| Corrección VENDEDOR  | Renombrar el rol en BD                    | Cambiar 2 anotaciones a `CAJERO`                                | `VENDEDOR` no existe en la tabla; es la intención aprobada y la única referencia del repo.                                                                                                                                          |
| Menú frontend        | Subconjunto por hijo                      | Agregar `ALMACENISTA` solo a módulos `inventario` y `logistica` | Producción es hijo del módulo `inventario` (no hay módulo top-level propio), así que queda cubierto.                                                                                                                                |

## Flujo de datos

```
V109 Flyway ──▶ roles (INSERT ALMACENISTA, idempotente)
                    │
PosController @PreAuthorize("hasAnyRole('ADMIN','CAJERO')")  ◀── JWT.role (no permisos)
                    │
shell.ts  modules[] filtered by userRole  ──▶ Inventarios + Logística (+ Producción hijo)
```

## Cambios de archivos

| Archivo                                                                           | Acción    | Descripción                                                     |
| --------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| `backend_pos-vta/src/main/resources/db/migration/V109__seed_almacenista_role.sql` | Crear     | INSERT idempotente del rol (SQL exacto abajo).                  |
| `backend_pos-vta/.../rest/PosController.java`                                     | Modificar | Líneas 56 y 66: `'VENDEDOR'` → `'CAJERO'`.                      |
| `posinvent/src/app/core/models/user.model.ts`                                     | Modificar | Unión `UserRole` + `'ALMACENISTA'` (línea 1).                   |
| `posinvent/src/app/features/admin/users/user-list.ts`                             | Modificar | `roleOptions` + `{ value:'ALMACENISTA', label:'ALMACENISTA' }`. |
| `posinvent/src/app/layout/shell/shell.ts`                                         | Modificar | `roles` de `inventario` y `logistica` (matriz abajo).           |
| `.ai_context/6-sdd_user_management.md`                                            | Modificar | §2: fila `ALMACENISTA` + nota `VENDEDOR`→`CAJERO`.              |

## Interfaces / contratos

**V109 SQL exacto:**

```sql
INSERT INTO roles (name, permissions) VALUES
    ('ALMACENISTA', '["inventory.*","production.*","logistics.*"]')
ON CONFLICT (name) DO NOTHING;
```

**PosController (2 líneas):** `@PreAuthorize("hasAnyRole('ADMIN','CAJERO')")` en POST y GET `/devolutions`.

**Unión UserRole final:**

```ts
export type UserRole = 'ADMIN' | 'ALMACENISTA' | 'CAJERO' | 'CARNICERO' | 'AUXILIAR' | 'CONTADOR';
```

**Matriz menú `shell.ts` (roles por módulo):**

| Módulo                                                       | Actual                       | Final                                     |
| ------------------------------------------------------------ | ---------------------------- | ----------------------------------------- |
| `inventario`                                                 | `ADMIN, CARNICERO, AUXILIAR` | `ADMIN, CARNICERO, AUXILIAR, ALMACENISTA` |
| `logistica`                                                  | `ADMIN, AUXILIAR`            | `ADMIN, AUXILIAR, ALMACENISTA`            |
| `administracion` / `compras` / `contabilidad`                | sin cambio                   | **sin `ALMACENISTA`** (excluidos)         |
| resto (`dashboard`, `pos`, `ventas`, `reportes`, `terceros`) | sin cambio                   | sin `ALMACENISTA`                         |

> `Producción` no tiene módulo top-level: es el hijo `{ label:'Producción', route:'/produccion/ordenes' }` dentro de `inventario`, por lo que agregar `ALMACENISTA` a `inventario.roles` ya lo expone.

## Estrategia de pruebas

| Capa      | Qué probar                       | Enfoque                                                                                                 |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Migración | Aplicación limpia + re-ejecución | `V109` aplica sin error; `SELECT name FROM roles` incluye `ALMACENISTA`; re-run no falla (ON CONFLICT). |
| Backend   | Compilación + sin `VENDEDOR`     | `gradlew compileJava` OK; `grep -R VENDEDOR` = 0.                                                       |
| Frontend  | Tipado                           | `npx tsc --noEmit` = 0 errores; specs Vitest existentes (`desposte-manual`, `faena`) pasan.             |

## Matriz de amenazas

`N/A — no hay boundary de routing, shell, subproceso, automatización VCS/PR, clasificación de ejecutables ni integración de procesos.`

## Migración / rollback

Sin migración de datos (INSERT puro). Rollback: revertir `V109` (el rol extra no rompe nada; los endpoints vuelven a `ADMIN`-only) y restaurar `PosController` (deja latente C3, no recomendado).

## Preguntas abiertas

- [ ] El módulo `inventario` expone a `ALMACENISTA` los hijos `Desposte` y `Registro animal`, cuyos componentes restringen por `isRoleAllowed` a `ADMIN`/`CARNICERO`. Es defensa en profundidad ya existente (menú visible, acción bloqueada); ¿se acepta así o se desea refinar roles por hijo (fuera de alcance)?
