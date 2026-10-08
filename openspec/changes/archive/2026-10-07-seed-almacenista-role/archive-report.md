# Archive Report: seed-almacenista-role (C3 — Sembrar rol ALMACENISTA y corregir VENDEDOR→CAJERO)

**Change**: `seed-almacenista-role`
**Archived**: 2026-10-07
**Artifact store**: `openspec` (repo `posinvent`)
**Status**: ARCHIVED — implementación completa; RDD aprobado y authority burned en ambos repos.

---

## Summary

Se sembró el rol `ALMACENISTA` (el "bodeguero" de `0-Interfaces.md` §8) vía Flyway `V109` con
permisos `inventory.*`, `production.*`, `logistics.*`, y se corrigió la referencia a un rol
`VENDEDOR` inexistente en `PosController` (`POST/GET /devolutions`) por `CAJERO`. Se alineó el
RBAC del frontend (union `UserRole`, filtro de usuarios, visibilidad de módulos del shell) y se
documentó la fila `ALMACENISTA` en el contrato `.ai_context/6-sdd_user_management.md` §2.

El estado final es autoritativo y supersede cualquier snapshot intermedio.

---

## Delivery Evidence

| # | Commit | Repo | Content |
|---|--------|------|---------|
| 1 | `3a02f27` | `backend_pos-vta` | `V109__seed_almacenista_role.sql` (INSERT idempotente `ON CONFLICT (name) DO NOTHING`) + `PosController` `VENDEDOR`→`CAJERO` en POST/GET `/devolutions` |
| 2 | `9986811` | `posinvent` | Union `UserRole` +`ALMACENISTA`, `roleOptions` en `user-list.ts`, módulos inventario/logística en `shell.ts` |
| 3 | `8ff4d01` | `backend_pos-vta` | `test: PosControllerDevolutionsAuthorizationTest` — cierra los hallazgos advisory R3-1/R3-2 del RDD de C3 |

Backend repo: `backend_pos-vta` (branch `feat/c3-seed-almacenista-role`).
Frontend repo: `posinvent` (branch `feat/c3-seed-almacenista-role`).

---

## Build & Test Evidence

| Check | Result | Details |
|-------|--------|---------|
| `./gradlew compileJava compileTestJava` (backend) | ✅ BUILD SUCCESSFUL | Verificado 2026-10-07 |
| Flyway validate (backend, al arrancar) | ✅ Successfully validated 108 migrations | Schema en `v109` |
| Hibernate `ddl-auto: validate` (backend) | ✅ OK | `Started PosInventApplication` sin drift |
| `roles` contiene `ALMACENISTA` | ✅ Verificado por SQL | `["inventory.*","production.*","logistics.*"]` |
| `PosControllerDevolutionsAuthorizationTest` (R3) | ✅ 4/4 | CAJERO 201/200; VENDEDOR 403; comprobado con mutación |
| `npx tsc --noEmit` (frontend) | ✅ exit 0 | Verificado 2026-10-07 |

**Migración aplicada**: Flyway aplicó `V109` sin error; `SELECT name FROM roles` incluye
`ALMACENISTA` con los permisos esperados (verificado contra PostgreSQL 16).

---

## Verify Verdict

**PASS** — RDD (receipt-driven development) ejecutado con scope `--base-ref master --committed-only`
y **aprobado + authority burned en ambos repos** (frontend y backend). Sin hallazgos bloqueantes.

| Requirement | Status |
|-------------|--------|
| REQ-V109 seed ALMACENISTA idempotente | ✅ Verificado (DB) |
| Union `UserRole` +ALMACENISTA | ✅ Verificado |
| `roleOptions` incluye ALMACENISTA | ✅ Verificado |
| `/devolutions` autoriza `CAJERO` (no `VENDEDOR`) | ✅ Verificado (+ test R3) |
| Menú shell expone módulos operativos a ALMACENISTA | ✅ Verificado |
| Contrato RBAC §2 documentado | ✅ Verificado (apply) |

---

## Follow-ups (registrados, NO implementados en este cambio)

1. **R3-3 — V109 no reconcilia una fila `ALMACENISTA` preexistente.** El
   `ON CONFLICT (name) DO NOTHING` es idempotente, pero si `ALMACENISTA` ya existía con otros
   permisos, V109 no los actualiza. Follow-up: decidir si el seed debe hacer upsert de `permissions`.
2. **Formalizar RBAC como capability openspec.** Hoy el contrato RBAC vive en `.ai_context`; este
   cambio mantiene esa decisión (declarada en `proposal.md`).
3. **`hasAnyRole` (nombre) vs `hasAuthority` (permiso).** La autorización sigue por nombre de rol;
   el JSONB de `permissions` es metadata. Migrar a autorización por permiso queda fuera de alcance.

---

## Archive Operations Performed

| Operation | Path |
|-----------|------|
| Change folder moved to archive | `openspec/changes/archive/2026-10-07-seed-almacenista-role/` |
| Delta spec synced as new main spec (domain did not previously exist) | `openspec/specs/user-management/spec.md` |

### Notes

- **New domain**: `openspec/specs/user-management/` no existía. El delta se copió como spec
  fuente-de-verdad con el encabezado normalizado (`# Spec: User Management (RBAC roles)`,
  `**Source change**: seed-almacenista-role (archived 2026-10-07)`), siguiendo el precedente de
  `costing-strategy-refactor`. Los requisitos ADDED/MODIFIED se aplanaron a una lista de requisitos
  (el spec principal no lleva marcadores de delta).
- **`verify-report.md` ausente en disco**: la carpeta no lo incluía. El veredicto PASS se sustenta
  en el resultado autoritativo del RDD (aprobado + burn en ambos repos).
- **Review state**: este repo no está gobernado por un gate de review nativo; la entrega fue por
  commits directos a la feature branch. RDD cubrió C3 en ambos repos.
- **Tasks gate**: todas las tareas de `tasks.md` (`1.1`–`2.5`) están `[x]`. Sin tareas pendientes.

---

## Artifact Inventory (archived folder)

- `proposal.md` ✅
- `design.md` ✅
- `specs/user-management/spec.md` ✅
- `tasks.md` ✅ (todas las tareas completas)
- `archive-report.md` ✅ (este archivo)

## Sprint/Status Tracker

`openspec/spec` (sprint tracker) sin cambios: `seed-almacenista-role` es un hallazgo (C3) sin slot
de sprint, consistente con el archive de C2.
