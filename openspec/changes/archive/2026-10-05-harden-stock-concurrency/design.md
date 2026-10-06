# Design: Harden Stock Concurrency (C1)

Add optimistic locking (`@Version`) to the 7 stock entities and coordinate the offending use cases to **retry** the transactional unit on version conflict, not fail-fast. Domain stays JPA-free; all version state lives in infrastructure.

## Architecture Decisions

| Decision | Choice | Tradeoff / Rationale |
|---|---|---|
| Retry boundary | **Use-case (unit-of-work) level**, not read level | Re-running only the read would break atomicity of `re-read + delta + kardex + audit`. The whole `@Transactional` unit re-runs in a fresh tx. |
| Retry mechanism | **Explicit bounded loop** (`OptimisticConcurrencyExecutor`), not Spring Retry `@Retryable` | `spring-retry` is not a dependency; avoid adding one. Bounded loop uses `TransactionTemplate` (already on classpath) to avoid `@Transactional` self-invocation. |
| Retry vs fail-fast | Retry for **stock deltas**; keep fail-fast for **entity editing** (`ThirdPartyRepositoryAdapter`) | Stock ops are *relative* (`newQty = freshQty ± delta`) — idempotent under re-application. Entity edits are *absolute* form submissions: silently retrying would clobber a second user's intentional fields. |
| Costing delete-all+re-insert | **Targeted `PESSIMISTIC_WRITE` on the parent `InventoryStock` row** | Delete has no row to version-check, so `@Version` alone can't fix it. Locking the concrete stock row serializes PROMEDIO recalculations. Not deferred — REQ-CONC-003 requires it. |

## Resolved Open Questions

**Q1 — Retry boundary + idempotency.** Retry lives at the use-case level: `OptimisticConcurrencyExecutor.execute(maxAttempts, unitOfWork)` re-runs the entire transactional unit. Idempotency is guaranteed by **transactional rollback**: kardex `InventoryMovement` is inserted in the *same* Postgres tx as the stock write, so a conflict at flush discards it. Audit is Postgres JPA `audit_log` (not MongoDB as the proposal assumed) via `AuditAspect`, which writes **only after** `proceed()` returns — a failed attempt writes nothing. Net: exactly one side-effect set per logical operation.

**Q2 — Version migration.** `BIGINT NOT NULL DEFAULT 0` is **sufficient; no backfill.** `version` is a pure lock counter (not business data); `DEFAULT 0` gives existing rows a valid value and eliminates the Hibernate 7 "detached entity version null" merge trap. Continue the V-sequence: **`V107__add_version_to_stock_entities.sql`** (7 `ALTER TABLE … ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;`).

**Q3 — CostingService delete-all + re-insert.** **In scope.** `resolveCostOnEntry/Exit` run inside the caller's tx (cross-bean `@Transactional`), so retry rollback prevents duplicates. The remaining *concurrent* race is fixed by a targeted `PESSIMISTIC_WRITE` lock on the parent stock row acquired at the start of `resolveCostOnEntry` (PROMEDIO branch). The latent `getCurrentStock()` SUM-aggregate lock is **not** reused.

## Entity Changes (infrastructure only)

Add `@Version private Long version;` to each (column `version`; `Long`→BIGINT):

| Entity | Table |
|---|---|
| `InventoryStockEntity` | `inventory_stock` |
| `CostLayerEntity` | `cost_layers` |
| `BatchEntity` | `batches` |
| `InventoryMovementEntity` | `inventory_movements` |
| `StockAdjustmentEntity` | `stock_adjustments` |
| `StockTransferEntity` | `stock_transfers` |
| `StockDisposalEntity` | `stock_disposals` |

Each mapper gains `@Mapping(target="version", ignore=true)` + `updateEntity(@MappingTarget …)` (id/createdAt/updatedAt/version ignored). Each adapter `save` switches from `jpa.save(toEntity(x))` to the merge-into-managed pattern (`findById` → `updateEntity` → `save`), mirroring `ThirdPartyRepositoryAdapter`, so the loaded version is compared at flush. **`domain` is unchanged — zero edits** (hexagonal contract honored).

## Retry Helper

```
// co.posinvent.application.usecase.OptimisticConcurrencyExecutor
public <T> T execute(int maxAttempts, Supplier<T> unitOfWork);
```
`maxAttempts = 5`, **no backoff** (conflict resolves on immediate re-read). Each attempt in `TransactionTemplate` (REQUIRES_NEW); catches `ObjectOptimisticLockingFailureException`/`OptimisticLockingFailureException`; on exhaustion throws `BusinessException("CONCURRENT_MODIFICATION")`.

## Use Case Coordination (re-read fresh → apply delta → re-save)

| Use case | Delta operation |
|---|---|
| `ManualStockEntryUseCase` | `currentQuantity += qty` (upsert) |
| `ManualStockExitUseCase` | `currentQuantity -= qty` (guard `INSUFFICIENT_STOCK`) |
| `CreateAdjustmentUseCase` | set absolute `quantityAfter` (re-apply fixed target) |
| `ConfirmTransferUseCase` | source `-= qty`, target `+= qty` per item |
| `CreateDisposalUseCase` | `currentQuantity -= qty` (guard) |
| `ProcessSlaughterUseCase` | set `currentQuantity = carcassWeight` (new batch upsert) |
| `ManualDesposteUseCase` | child `+= weight`, parent `-= consumedWeight` |
| `CostingService` | layer insert / delete+re-insert under stock-row lock |
| `ExpirationMonitorJob.disposeExpiredBatch` | set `currentQuantity = 0` |

`CreateTransferUseCase` (DRAFT) only validates + persists a new record — no stock delta.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Integration | 100 simultaneous decrements on one `InventoryStock` (`qty=100`, each `-1`) | Testcontainers Postgres; `ExecutorService`/virtual threads; assert final `qty=0`, zero negative, zero lost updates |
| Integration | Conflict forcing | Two threads read same row, first commits, second must retry — assert version bump + no `CONCURRENT_MODIFICATION` surfaced |
| Integration | Oversell rejection | `qty=5`, decrement `8` → `INSUFFICIENT_STOCK`, `qty` stays `5` |
| Unit | `OptimisticConcurrencyExecutor` | Exhaustion → `BusinessException`; success on 1st/2nd attempt |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

`V107` additive (`ADD COLUMN IF NOT EXISTS`, `DEFAULT 0`), safe to apply under load. Rollback: `flyway undo` V107 + remove `@Version`/`updateEntity`/retry — returns to current behavior with no data loss.

## Risks

- `ConfirmTransferUseCase`: status guard (`!= DRAFT → throw`) makes a *completed* confirm non-idempotent if a retry fires post-commit — document, treat as low-likelihood.
- Audit is Postgres, not MongoDB (proposal discrepancy) — simplifies the idempotency story.
