# Tasks: Costing Strategy Refactor (C2)

**Backend-only — NO [FE] tasks.** Source paths are relative to `C:\POS_VTA\backend_pos-vta` unless absolute.

## Phase 1 — Domain Strategy Pattern (Slice 1)

- [x] 1.1 Create `src/main/java/co/posinvent/domain/service/CostingMethod.java` — enum `FIFO`,`WEIGHTED_AVG` + `static fromString(String)` (null/blank/unknown → FIFO). No Spring/JPA.
- [x] 1.2 Create `src/main/java/co/posinvent/domain/service/CostingStrategy.java` — interface: `CostingMethod method()`, `EntryCostingResult onEntry(StockEntry, List<CostLayer>)`, `CostConsumptionResult onExit(List<CostLayer>, BigDecimal)`.
- [x] 1.3 Create `src/main/java/co/posinvent/domain/service/StockEntry.java` — immutable record VO.
- [x] 1.4 Create `src/main/java/co/posinvent/domain/service/EntryCostingResult.java` — record VO (`resultingUnitCost`, `layersToUpsert`, `replaceExisting`).
- [x] 1.5 Create `src/main/java/co/posinvent/domain/service/CostConsumptionResult.java` — record VO (`consumedUnitCost`, `layersToUpsert`, `layerIdsToDelete`).
- [x] 1.6 Create `src/main/java/co/posinvent/domain/service/FifoCostingStrategy.java` — entry: single new layer; exit: FEFO consume (expiry ASC), returns mutations, **no repository calls**.
- [x] 1.7 Create `src/main/java/co/posinvent/domain/service/WeightedAvgCostingStrategy.java` — entry: `Σ(qty×cost)/Σ(qty)` 6dp `HALF_UP` → merged layer.
- [x] 1.8 Write pure unit tests `src/test/java/co/posinvent/domain/service/{FifoCostingStrategyTest,WeightedAvgCostingStrategyTest,CostingMethodTest}.java` — no Spring/JPA.
- [x] 1.9 Verify: `.\gradlew.bat compileJava` and `.\gradlew.bat test --tests "co.posinvent.domain.service.*"` (workdir `C:\POS_VTA\backend_pos-vta`).

## Phase 2 — Orchestrator (Slice 2)

- [x] 2.1 Rename `src/main/java/co/posinvent/application/usecase/CostingService.java` → `CostingOrchestrator.java`. Resolve global `company_config.costing_method` via config port `findConfig()` → `CostingMethod.fromString`; select strategy; load layers via `CostLayerRepository`; delegate pure calc; persist. Retain C1 `PESSIMISTIC_WRITE` lock (WEIGHTED_AVG entry, before read + before persist) and `@Transactional` in application only.
- [x] 2.2 Update callers `FormulaProductionUseCase.java` and `PosCheckoutUseCase.java` (field/constructor/type `CostingService` → `CostingOrchestrator`).
- [x] 2.3 Update tests: rename `CostingServiceTest` → `CostingOrchestratorTest`; update mocks in `FormulaProductionUseCaseTest`, `PosCheckoutUseCaseTest`.
- [x] 2.4 Write equivalence test (REQ-COST-005): golden 6dp `unitCost` from old algo vs new strategies.
- [x] 2.5 Write contract test (REQ-COST-001/007): domain strategies import neither `application` nor `infrastructure`; no `@Transactional`/`@Service`/JPA in domain.
- [x] 2.6 Verify: `.\gradlew.bat compileJava` and `.\gradlew.bat test`.

## Phase 3 — Migration + selector alignment (Slice 3)

- [x] 3.1 Create `src/main/resources/db/migration/V108__normalize_cost_method.sql` — normalize `company_config.costing_method`: `PEPS→FIFO`, `PROMEDIO_PONDERADO`/`WEIGHTED_AVERAGE→WEIGHTED_AVG`, `ESTANDAR`/`IDENTIFICACION_ESPECIFICA→FIFO`, drop `YIELD_COSTING`. Idempotent.
- [x] 3.2 Update `infrastructure/adapters/out/persistence/KardexRepositoryAdapter.java` — `"PEPS"` → `"FIFO"` (line 58).
- [x] 3.3 Update `FormulaProductionUseCase.java` — fallback `WEIGHTED_AVERAGE` → `FIFO` (line 106).
- [x] 3.4 Verify: `.\gradlew.bat compileJava` and `.\gradlew.bat test` (migration runs on boot).

## Phase 4 — Cross-cutting spec rename (Slice 4)

- [x] 4.1 Edit `C:\POS_VTA\posinvent\openspec\specs\stock-concurrency\spec.md` — rename `CostingService` → `CostingOrchestrator` in REQ-CONC-003 scenario (lines 78/80). Docs-only.

---

## Review Workload Forecast

Estimated changed lines: ~800 (additions + deletions).

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Domain Strategy Pattern (Slice 1) | PR 1 | `.\gradlew.bat test --tests "co.posinvent.domain.service.*"` | N/A — pure additive domain, no runtime wiring | Delete 7 new `domain/service/*` files + tests |
| 2 | Orchestrator reshape (Slice 2) | PR 2 | `.\gradlew.bat test` | `.\gradlew.bat test` — caller tests exercise orchestrator | `git revert` rename + caller/test edits |
| 3 | Migration + selector + spec rename (Slices 3-4) | PR 3 | `.\gradlew.bat test` | Flyway migration on boot + `compileJava` | Revert V108 + two one-line edits |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
