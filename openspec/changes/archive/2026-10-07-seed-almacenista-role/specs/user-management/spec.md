# Spec — seed-almacenista-role (Hallazgo C3)

> Delta de especificación del dominio `user-management`. La tabla RBAC completa sigue viviendo
> en `.ai_context/6-sdd_user_management.md` §2 (contrato de proyecto); este artefacto fija los
> requisitos/escenarios de ESTE cambio que guían `design`, `tasks`, `apply` y `verify`.

## ADDED Requirements

### Requirement: Sembrar rol ALMACENISTA (idempotente)

El sistema MUST insertar el rol `ALMACENISTA` con permisos JSONB
`["inventory.*","production.*","logistics.*"]` vía migración Flyway `V109`,
sin fallar si el rol ya existe.

#### Scenario: Aplicación limpia de V109

- GIVEN roles sembrados por `V1__create_roles.sql`
- WHEN Flyway aplica `V109__seed_almacenista_role.sql`
- THEN `SELECT name FROM roles` incluye `ALMACENISTA`
- AND sus permisos son `inventory.*`, `production.*`, `logistics.*`

#### Scenario: Re-ejecución con rol existente

- GIVEN `ALMACENISTA` ya existe en `roles`
- WHEN se reintenta el INSERT
- THEN `ON CONFLICT (name) DO NOTHING` evita violación de UNIQUE

### Requirement: Ampliar union UserRole del frontend

El union `UserRole` en `core/models/user.model.ts` MUST incluir `'ALMACENISTA'`
para que el tipado compile.

#### Scenario: Compilación sin errores

- GIVEN `UserRole = 'ADMIN' | 'CAJERO' | 'CARNICERO' | 'AUXILIAR' | 'CONTADOR'`
- WHEN se agrega `'ALMACENISTA'` al union
- THEN `tsc --noEmit` termina sin errores

### Requirement: Filtrar por rol ALMACENISTA en usuarios

`roleOptions` en `admin/users/user-list.ts` MUST incluir la opción `ALMACENISTA`.

#### Scenario: Filtro por rol

- GIVEN la lista de usuarios
- WHEN el operador selecciona el filtro "ALMACENISTA"
- THEN se muestran solo los usuarios con ese rol

## MODIFIED Requirements

### Requirement: /devolutions autoriza CAJERO (no VENDEDOR)

`PosController` MUST anotar `POST /devolutions` y `GET /devolutions` con
`@PreAuthorize("hasAnyRole('ADMIN','CAJERO')")`, reemplazando `VENDEDOR`.
(Previously: ambos endpoints autorizaban `VENDEDOR`, rol inexistente → 403 práctico.)

#### Scenario: Cajero crea devolución

- GIVEN usuario autenticado con rol `CAJERO`
- WHEN llama `POST /api/v1/pos/devolutions`
- THEN el endpoint autoriza (sin 403)

#### Scenario: Sin referencias VENDEDOR

- GIVEN el código del backend
- WHEN se busca `VENDEDOR`
- THEN hay 0 coincidencias en todo el repo

### Requirement: Menú shell expone módulos operativos a ALMACENISTA

El menú de `shell.ts` MUST incluir `ALMACENISTA` en Inventarios, Logística y Producción,
y MUST excluir Administración, Compras y Contabilidad.
(Previously: `ALMACENISTA` no existía en el `roles[]` de ningún módulo.)

#### Scenario: Bodeguero ve su menú

- GIVEN usuario con rol `ALMACENISTA`
- WHEN renderiza el shell
- THEN ve Inventarios, Logística y Producción
- AND NO ve Administración, Compras ni Contabilidad

### Requirement: Documentar ALMACENISTA en contrato RBAC

La tabla §2 de `.ai_context/6-sdd_user_management.md` MUST incluir la fila
`ALMACENISTA` (`inventory.*`, `production.*`, `logistics.*`) y una nota `VENDEDOR`→`CAJERO`.
(Previously: la tabla listaba solo ADMIN, CARNICERO, CAJERO, AUXILIAR, CONTADOR.)

#### Scenario: Contrato actualizado

- GIVEN el contrato RBAC §2
- WHEN se revisa tras el cambio
- THEN la fila `ALMACENISTA` está presente y `VENDEDOR` está renombrado a `CAJERO`
