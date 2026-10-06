# Design: Costing Strategy Refactor (C2)

## Technical Approach

Extract pure costing math out of `CostingService` (application) into a `domain/service` Strategy Pattern, then reshape the service into a thin hexagonal orchestrator. The domain computes *what* to persist (pure value objects); the orchestrator resolves the global method, loads layers via repository, delegates, and persists — retaining the C1 `PESSIMISTIC_WRITE` lock and `@Transactional` in application only.

## Architecture Decisions

| Decision | Choice | Rejected | Why |
|---|---|---|---|
| Fallback when config unset | `FIFO` | current `WEIGHTED_AVERAGE` (code) / `PROMEDIO_PONDERADO` (product default) | §COSTEO declares PEPS "método base"; LIFO prohibited (NIC 2 / §13 NIIF). FIFO is the deterministic, regulatory-safe default (REQ-COST-002). The `WEIGHTED_AVERAGE` fallback is a spec deviation. |
| Method signature | `onEntry(StockEntry, List<CostLayer>)` + `onExit(List<CostLayer>, BigDecimal)` | spec's single `calculateUnitCost(StockEntry, ProductInventory)` | The engine has TWO operations: entry (create/merge layer) and exit (consume layers). A single method would mix both, force impure I/O, and return incompatible shapes. Two pure methods return value objects (REQ-COST-003/004). |
| ESTANDAR / IDENTIFICACION_ESPECIFICA | → `FIFO` (migration) | kept as distinct strategy | Both are UNIMPLEMENTED — `CostingService` only branches `PEPS`/`PROMEDIO_PONDERADO`; everything else falls to a "create layer" default (≈ FIFO). FIFO layers approximate both. |
| YIELD_COSTING | untouched, excluded from aggregation | mapped to a strategy | Yield Costing is the Desposte transformation (§COSTEO), NOT a stock selector. Mapping it would corrupt stock exits. |
| Selector source | `company_config.costing_method` (GLOBAL, `FIFO`\|`WEIGHTED_AVG`) | `product.costingMethod()` | Spec mandates a single global config; per-product is legacy (REQ-COST-002/006). |

## Data Flow

```
CostingOrchestrator (application)
  │ 1. productRepo.findById (exists check)
  │ 2. configRepo.findConfig() → costingMethod → CostingMethod → strategy
  │ 3. [WEIGHTED_AVG entry] stockJpaRepository.lockForUpdate()  ← C1 lock
  │ 4. layerRepo.findByProductBatchWarehouse[Fefo]
  │ 5. strategy.onEntry/onExit → pure result VO
  │ 6. layerRepo.save / deleteAllByProductBatchWarehouse
  └─ return unitCost
```

## Domain Classes (`co.posinvent.domain.service`) — JPA/Spring-free

```java
enum CostingMethod { FIFO, WEIGHTED_AVG; static CostingMethod fromString(String); } // null/blank/unknown → FIFO

interface CostingStrategy {
    CostingMethod method();
    EntryCostingResult onEntry(StockEntry entry, List<CostLayer> existing);
    CostConsumptionResult onExit(List<CostLayer> layers, BigDecimal quantity);
}

record StockEntry(UUID productId, UUID batchId, UUID warehouseId,
                  BigDecimal quantity, BigDecimal unitCost, UUID sourceMovementId, OffsetDateTime entryDate) {}
record EntryCostingResult(BigDecimal resultingUnitCost, List<CostLayer> layersToUpsert, boolean replaceExisting) {}
record CostConsumptionResult(BigDecimal consumedUnitCost, List<CostLayer> layersToUpsert, List<UUID> layerIdsToDelete) {}

class FifoCostingStrategy implements CostingStrategy { /* entry: single new layer; exit: FEFO consume */ }
class WeightedAvgCostingStrategy implements CostingStrategy { /* entry: Σ(qty×cost)/Σ(qty) → merged layer; exit: single layer */ }
```

Rounding: `divide(..., 6, RoundingMode.HALF_UP)` everywhere; FEFO order = expiry ASC via `findByProductBatchWarehouseFefo`.

## Application Orchestrator

**`CostingOrchestrator`** (renamed from `CostingService`), `@Service`, constructor-injected ports + field-injected `StockJpaRepository` (lock). Holds `Map.of(FIFO, new FifoCostingStrategy(), WEIGHTED_AVG, new WeightedAvgCostingStrategy())` (stateless — no Spring in domain). `@Transactional` on mutating methods. Lock order unchanged: on WEIGHTED_AVG entry, lock *before* reading layers, *before* persisting.

## File Changes

| File | Action | Description |
|---|---|---|
| `domain/service/CostingMethod.java` | Create | enum + `fromString` (fallback FIFO) |
| `domain/service/CostingStrategy.java` | Create | interface |
| `domain/service/FifoCostingStrategy.java` | Create | FEFO consume, no repo calls |
| `domain/service/WeightedAvgCostingStrategy.java` | Create | weighted-average merge |
| `domain/service/StockEntry.java` | Create | entry VO |
| `domain/service/EntryCostingResult.java` | Create | entry result VO |
| `domain/service/CostConsumptionResult.java` | Create | exit result VO |
| `application/usecase/CostingService.java` | Rename → `CostingOrchestrator.java` | orchestration only |
| `db/migration/V108__migrate_costing_method.sql` | Create | see below |
| `application/usecase/FormulaProductionUseCase.java` | Modify | fallback `WEIGHTED_AVERAGE` → `FIFO` |
| `infrastructure/.../KardexRepositoryAdapter.java` | Modify | `"PEPS"` → `"FIFO"` branch |
| `openspec/.../stock-concurrency/spec.md` | Modify (note) | REQ-CONC-003 rename `CostingService` → `CostingOrchestrator` |

## Flyway Migration — **V108**

Precedence (idempotent):
1. `company_config.costing_method` non-null/non-blank → normalize → authoritative.
2. Else derive from `product.costing_method` (exclude `YIELD_COSTING`, null): ANY `PROMEDIO_PONDERADO` → `WEIGHTED_AVG`; else `FIFO`. No products → `FIFO`.

Value map: `PEPS→FIFO`, `PROMEDIO_PONDERADO→WEIGHTED_AVG`, `WEIGHTED_AVERAGE→WEIGHTED_AVG`, `ESTANDAR→FIFO`, `IDENTIFICACION_ESPECIFICA→FIFO`, `YIELD_COSTING→excluded`. Note: V62 already created `company_config.costing_method` (default `'WEIGHTED_AVERAGE'`) — V108 populates/normalizes, does not re-add the column.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | weighted-avg, FIFO/FEFO consume, rounding, insufficient stock | pure JUnit, no Spring/JPA |
| Equivalence | byte-identical `unitCost` 6dp before/after | feed same layers to old algo (golden) and new strategy; assert equality (REQ-COST-005) |
| Contract | lock + `@Transactional` in application; domain side-effect-free | ArchUnit/import scan (REQ-COST-001/007) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration beyond V108. Rollback = `git revert` (no schema-only side effects; domain tests additive).

## Open Questions

- [ ] `recalculateUnitCost` (updates `inventory_stock.unit_cost`, not layers) — reuse WA strategy or leave as-is? Recommend reuse to avoid duplicate rounding logic.
- [ ] Confirm no other consumer reads `product.costingMethod()` before removing its CHECK constraint.
