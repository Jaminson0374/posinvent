# Tasks: Harden Stock Concurrency (C1)

**Backend-only change. There are NO `[FE]` tasks** — no frontend files are touched. All tasks are `[BE]`.

## Task Dependencies

- Slice 1 must complete before Slice 2 (retry assumes `@Version` + merge-into-managed save).
- Slice 2 must complete before Slice 3 (integration tests need the retry wiring).
- Within Slice 1: entities (1.2) depend on migration (1.1); mappers/adapters (1.3) depend on entities.

---

## Phase 1 — Fundación (Slice 1)

- [x] 1.1 `[BE]` Create `src/main/resources/db/migration/V107__add_version_to_stock_entities.sql` with 7 `ALTER TABLE … ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;` on `inventory_stock`, `cost_layers`, `batches`, `inventory_movements`, `stock_adjustments`, `stock_transfers`, `stock_disposals`.
- [x] 1.2 `[BE]` Add `@Version private Long version;` to the 7 entities under `backend_pos-vta/src/main/java/co/posinvent/infrastructure/adapters/out/persistence/`: `InventoryStockEntity.java`, `CostLayerEntity.java`, `BatchEntity.java`, `InventoryMovementEntity.java`, `StockAdjustmentEntity.java`, `StockTransferEntity.java`, `StockDisposalEntity.java`.
- [x] 1.3 `[BE]` For each of the 7 mappers (`StockMapper.java`, `CostLayerMapper.java`, `BatchMapper.java`, `KardexMapper.java`, `StockAdjustmentMapper.java`, `StockTransferMapper.java`, `StockDisposalMapper.java`): add `@Mapping(target="version", ignore=true)` and an `updateEntity(@MappingTarget …)` (ignoring id/createdAt/updatedAt/version).
- [x] 1.4 `[BE]` For each of the 7 adapters (`StockRepositoryAdapter.java`, `CostLayerRepositoryAdapter.java`, `BatchRepositoryAdapter.java`, `KardexRepositoryAdapter.java`, `StockAdjustmentRepositoryAdapter.java`, `StockTransferRepositoryAdapter.java`, `StockDisposalRepositoryAdapter.java`): switch `save` from `jpa.save(toEntity(x))` to merge-into-managed (`findById` → `updateEntity` → `save`).
- [x] 1.5 `[BE]` Verify: `gradlew compileJava` (BUILD SUCCESSFUL) from `C:\POS_VTA\backend_pos-vta`.

## Phase 2 — Coordinación de reintento (Slice 2)

- [x] 2.1 `[BE]` Create `application/usecase/OptimisticConcurrencyExecutor.java`: `execute(int maxAttempts, Supplier<T> unitOfWork)` in `TransactionTemplate` (REQUIRES_NEW); catch `ObjectOptimisticLockingFailureException`/`OptimisticLockingFailureException`; `maxAttempts=5`; exhaustion → `BusinessException("CONCURRENT_MODIFICATION")`.
- [x] 2.2 `[BE]` Wire retry into the 9 offenders (`application/usecase/` unless noted), re-read → apply delta → re-save:
  - `ManualStockEntryUseCase.java` — `currentQuantity += qty` (upsert)
  - `ManualStockExitUseCase.java` — `currentQuantity -= qty` (guard `INSUFFICIENT_STOCK`)
  - `CreateAdjustmentUseCase.java` — set absolute `quantityAfter`
  - `ConfirmTransferUseCase.java` — source `-= qty`, target `+= qty` per item
  - `CreateDisposalUseCase.java` — `currentQuantity -= qty` (guard)
  - `ProcessSlaughterUseCase.java` — `currentQuantity = carcassWeight` (new batch upsert)
  - `ManualDesposteUseCase.java` — child `+= weight`, parent `-= consumedWeight`
  - `CostingService.java` — layer insert / delete+re-insert under stock-row lock
  - `application/service/ExpirationMonitorJob.java` (`disposeExpiredBatch`) — `currentQuantity = 0`
- [x] 2.3 `[BE]` In `CostingService.java`, acquire targeted `PESSIMISTIC_WRITE` lock on parent `InventoryStock` row at start of `resolveCostOnEntry` (PROMEDIO branch).
- [x] 2.4 `[BE]` Verify: `gradlew compileJava` then `gradlew test` from `C:\POS_VTA\backend_pos-vta`.

## Phase 3 — Pruebas de concurrencia (Slice 3)

- [x] 3.1 `[BE]` Create `src/test/java/co/posinvent/integration/StockConcurrencyIntegrationTest.java` (Testcontainers Postgres): 100 simultaneous decrements on one stock (`qty=100`, each `-1`) → assert `qty=0`, zero negative, zero lost updates.
- [x] 3.2 `[BE]` Add integration cases: conflict-forcing (two threads, second retries → version bump, no `CONCURRENT_MODIFICATION`) and oversell rejection (`qty=5`, decrement `8` → `INSUFFICIENT_STOCK`, `qty=5`).
- [x] 3.3 `[BE]` Create `src/test/java/co/posinvent/application/usecase/OptimisticConcurrencyExecutorTest.java`: exhaustion → `BusinessException`; success on 1st and 2nd attempt.
- [x] 3.4 `[BE]` Verify: `gradlew test` from `C:\POS_VTA\backend_pos-vta`.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 (range 500–650) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Slice 1) → PR 2 (Slice 2) → PR 3 (Slice 3) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (ask user) |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Slice 1 — migration + `@Version` + merge-into-managed save | PR 1 | `gradlew compileJava` | `gradlew test` (existing suites) | Revert V107 + remove `@Version`/`updateEntity` |
| 2 | Slice 2 — retry executor + 9 offenders + costing lock | PR 2 | `gradlew test` | Existing manual stock/desposte flows | Remove executor + unwrap use-case wiring |
| 3 | Slice 3 — concurrency integration + unit tests | PR 3 | `gradlew test --tests "*Concurrency*"` | Testcontainers Postgres scenario | Delete new test files only |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
