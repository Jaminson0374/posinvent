# Spec: Stock Concurrency (Inventory Concurrency Hardening)

**Domain**: stock-concurrency | **Source change**: harden-stock-concurrency (archived 2026-10-05)
**Existing behavior**: None of the 7 stock entities (`InventoryStockEntity`, `CostLayerEntity`, `BatchEntity`, `InventoryMovementEntity`, `StockAdjustmentEntity`, `StockTransferEntity`, `StockDisposalEntity`) carries a `@Version` field. Use cases perform read-modify-write on `currentQuantity` without version checks, producing lost-update and oversell under concurrent load (POS, desposte, ajustes, traslados, job de vencimiento).

## ADDED Requirements

| REQ         | Description                                                              | Strength |
| ----------- | ------------------------------------------------------------------------ | -------- |
| REQ-CONC-001 | 7 stock entities carry a `version` column for optimistic locking          | MUST     |
| REQ-CONC-002 | Concurrent conflict → RETRY the unit of work (re-read + re-apply delta), not fail-fast | MUST |
| REQ-CONC-003 | Retry MUST NOT duplicate kardex movements or audit side-effects (idempotency invariant) | MUST |
| REQ-CONC-004 | No oversell / no lost-update; available stock respected atomically        | MUST     |
| REQ-CONC-005 | `version` migration additive and safe for existing rows (`DEFAULT 0`)     | MUST     |

---

### REQ-CONC-001 — Optimistic version control on the 7 stock entities

The 7 stock entities MUST carry a `version` column used for optimistic locking via `@Version`. The version MUST live only in the infrastructure (JPA) layer; domain records MUST NOT carry it (hexagonal contract).

#### Scenario: Version increments on update

- GIVEN an `InventoryStockEntity` row with `version = 0`
- WHEN the entity is mutated and flushed
- THEN `version` becomes `1`, and each subsequent flush increments it
- AND the domain record flowing through the use case carries no `version` field

#### Scenario: Column present on all 7 tables

- GIVEN the Flyway migration has run
- WHEN each of the 7 tables is inspected
- THEN `inventory_stock`, `cost_layer`, `batch`, `inventory_movement`, `stock_adjustment`, `stock_transfer`, `stock_disposal` each expose a `version BIGINT NOT NULL DEFAULT 0` column

---

### REQ-CONC-002 — Conflict detection + RETRY (not fail-fast)

When a transaction detects `OptimisticLockingFailureException` (or `ObjectOptimisticLockingFailureException`), the system MUST retry the unit of work — re-read the fresh entity state, re-apply the delta, and re-execute the transaction — rather than surfacing `CONCURRENT_MODIFICATION` as the primary outcome.

#### Scenario: Two concurrent decrements converge

- GIVEN stock `currentQuantity = 10` and two concurrent requests, each decrementing `4`
- WHEN both mutate simultaneously and one hits an optimistic lock failure
- THEN the failed one retries against fresh state (`currentQuantity = 6`) and re-applies its decrement
- AND final `currentQuantity = 2`, with no `CONCURRENT_MODIFICATION` surfaced

#### Scenario: Retry limit exhausted

- GIVEN a use case configured with a bounded retry limit `N`
- WHEN conflicts persist beyond `N` retries
- THEN the unit of work fails with a defined concurrency error (no infinite retry)

#### Scenario: Single writer, no conflict

- GIVEN a single mutation with no concurrent writer
- WHEN the transaction commits
- THEN no retry occurs and behavior is unchanged from today

---

### REQ-CONC-003 — No double side-effects on retry (idempotency invariant)

The retried unit of work MUST NOT duplicate kardex movements (`InventoryMovement`) or audit side-effects. **Idempotency invariant**: for a single logical operation, exactly one set of side-effect records is produced regardless of retry count — side-effects are keyed by the logical operation (e.g. `referenceType` + `referenceId` + `movementType`) so re-execution reuses or replaces, never appends duplicates.

#### Scenario: Single kardex movement per logical operation

- GIVEN a consumption that retries once after an optimistic lock failure
- WHEN the retry succeeds
- THEN exactly one `InventoryMovement` (EXIT) exists for that logical operation, not two

#### Scenario: Audit log not double-written

- GIVEN a retried unit of work that also writes an audit record (MongoDB, possibly outside the Postgres transaction)
- WHEN the retry completes
- THEN the audit store contains exactly one audit record for the operation

#### Scenario: CostingService delete-all + re-insert

- GIVEN `CostingService` performs delete-all + re-insert of cost layers
- WHEN a retry occurs
- THEN no duplicate or orphaned cost layers are produced (idempotent re-insert)

---

### REQ-CONC-004 — No oversell / no lost-update

Concurrent decrements MUST never drive `current_quantity` below zero, and MUST never lose an increment. Available stock (`current_quantity - committed_quantity`) MUST be respected atomically.

#### Scenario: 100 simultaneous decrements (integration)

- GIVEN `InventoryStock` with `currentQuantity = 100`, `committedQuantity = 0`
- WHEN 100 simultaneous requests each decrement `1`
- THEN final `currentQuantity = 0`, no decrement is lost, and no negative value occurs

#### Scenario: Mixed concurrent increments and decrements

- GIVEN `currentQuantity = 50`, a concurrent batch of increments (+20 total) and decrements (-15 total)
- WHEN all commit
- THEN final `currentQuantity = 55` (50 + 20 - 15), with no lost update

#### Scenario: Oversell rejected

- GIVEN `currentQuantity = 5`, `committedQuantity = 0`, and a request to decrement `8`
- WHEN the decrement is applied
- THEN the operation is rejected (`INSUFFICIENT_STOCK`) and `currentQuantity` remains `5`

---

### REQ-CONC-005 — Migration idempotency

The `version` column migration MUST be additive and safe for existing rows: `version BIGINT NOT NULL DEFAULT 0`.

#### Scenario: Existing rows default to 0

- GIVEN a table with pre-existing rows and no `version` column
- WHEN the Flyway migration runs
- THEN all existing rows receive `version = 0` without data loss
- AND the migration is idempotent (recorded once, safe to apply)

#### Scenario: Rolling upgrade

- GIVEN a deployment window where old code writes without `version` while new code writes with `version`
- WHEN both operate concurrently
- THEN no write is lost or rejected due to a null/0 `version` (depends on the backfill decision in design)

---

## REMOVED Requirements

None.

## Non-goals (explicitly out of scope)

- **C2** — costing concurrency (beyond the `CostingService` retry already in scope).
- **C3** — role-based access control.
- **A1** — hexagonal layering refactor.
- **A3** — `@Transactional` self-invocation.
- `KardexJpaRepository.getCurrentStock()` `PESSIMISTIC_WRITE` fix (documented latent bug; not corrected here).
