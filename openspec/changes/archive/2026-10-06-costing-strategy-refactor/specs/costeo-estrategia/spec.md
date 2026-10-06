# Delta for Costeo Estrategia (Hallazgo C2)

**Domain**: costeo-estrategia | **Change**: costing-strategy-refactor
**Existing behavior**: `CostingService` lives in `application/usecase` and mixes pure costing math (weighted-average recalculation, FIFO/FEFO consumption) with infrastructure concerns — `layerRepo.save` inside the consume loop, the C1 `PESSIMISTIC_WRITE` lock, and `@Transactional`. No Strategy Pattern exists; the selector reads `product.costingMethod()` (per-product) with legacy values (`PEPS`/`PROMEDIO_PONDERADO`/`ESTANDAR`/`IDENTIFICACION_ESPECIFICA`/`YIELD_COSTING`) instead of the spec'd `company_config.costing_method` (`FIFO`/`WEIGHTED_AVG`).

## ADDED Requirements

| REQ          | Description                                                                           | Strength |
| ------------ | ------------------------------------------------------------------------------------- | -------- |
| REQ-COST-001 | `CostingStrategy` interface + FIFO/WeightedAvg implementations in `domain/service`, JPA-free | MUST |
| REQ-COST-002 | Strategy resolved from GLOBAL `company_config.costing_method` with deterministic fallback | MUST |
| REQ-COST-003 | Weighted-average recalc: `Σ(qty×cost)/Σ(qty)` at 6dp `HALF_UP`                        | MUST |
| REQ-COST-004 | FIFO/FEFO consumption returns a pure `CostConsumptionResult` (no repository calls)    | MUST |
| REQ-COST-005 | Behavioral parity: identical `unitCost` (6dp) before/after refactor                    | MUST |
| REQ-COST-006 | Flyway migrates costing method to `company_config` with defined value mapping          | MUST |
| REQ-COST-007 | Repository I/O, C1 lock, and `@Transactional` stay in application; domain is side-effect-free | MUST |

---

### REQ-COST-001 — Pure Strategy Pattern in domain/service

A `CostingStrategy` interface MUST live in `domain/service` with `FifoCostingStrategy` and `WeightedAvgCostingStrategy` implementations. The interface and implementations MUST NOT import anything from `application` or `infrastructure` (JPA-free, Spring-free). Each strategy MUST expose pure operations for costing an entry (creating/merging a cost layer) and costing an exit (consuming layers), returning immutable value objects. The exact method signature (`calculateUnitCost` vs `onEntry`/`onExit`) is a design decision.

#### Scenario: Strategy is Spring/JPA-free

- GIVEN `FifoCostingStrategy` and `WeightedAvgCostingStrategy`
- WHEN their source is inspected
- THEN neither imports `application` nor `infrastructure` packages
- AND neither references `@Transactional`, `@Service`, or JPA repository types

#### Scenario: Pure unit test runs without container

- GIVEN a unit test instantiating a strategy with plain in-memory layers
- WHEN the test executes without Spring context or JPA
- THEN it passes, proving the algorithm is pure

---

### REQ-COST-002 — Global strategy selection

The strategy MUST be resolved from the GLOBAL `company_config.costing_method` value (`FIFO` | `WEIGHTED_AVG`), never from `product.costingMethod()`. When the config value is unset, resolution MUST fall back deterministically to a single defined default (`FIFO`, the base method per §COSTEO — exact default to be confirmed in design).

#### Scenario: FIFO configured

- GIVEN `company_config.costing_method = 'FIFO'`
- WHEN the strategy is resolved
- THEN a `FifoCostingStrategy` is selected

#### Scenario: WEIGHTED_AVG configured

- GIVEN `company_config.costing_method = 'WEIGHTED_AVG'`
- WHEN the strategy is resolved
- THEN a `WeightedAvgCostingStrategy` is selected

#### Scenario: Value unset

- GIVEN `company_config.costing_method` is NULL
- WHEN the strategy is resolved
- THEN the deterministic fallback strategy is selected (no exception)

---

### REQ-COST-003 — Weighted-average recalculation

The weighted-average strategy MUST compute unit cost as `Σ(remainingQty × unitCost) / Σ(remainingQty)` over remaining layer quantities, rounded to 6 decimal places with `HALF_UP`.

#### Scenario: Two layers merge

- GIVEN layers of `10 @ $5.00` and `20 @ $8.00`
- WHEN the weighted average is computed
- THEN unit cost is `(10×5.00 + 20×8.00)/(10+20) = 7.000000`

#### Scenario: Rounding to 6dp

- GIVEN quantities producing a repeating decimal
- WHEN the average is computed
- THEN the result is rounded to exactly 6 decimals with `HALF_UP`

---

### REQ-COST-004 — FIFO/FEFO consumption is pure

`FifoCostingStrategy` MUST iterate layers ordered by expiry ASC, consume `min(remaining, layer.remainingQuantity())` per layer, and return a `CostConsumptionResult` (list of layer mutations + average consumed unit cost). It MUST NOT call any repository (`layerRepo.save` stays out).

#### Scenario: Full consumption across two layers

- GIVEN layers expiring in order: `L1 @ $6.00` qty 5, `L2 @ $7.00` qty 10, and a request for 12
- WHEN FIFO consumption runs
- THEN `L1` is fully consumed (5) and `L2` partially (7), returned as mutations
- AND the average consumed unit cost is `(5×6.00 + 7×7.00)/12`

#### Scenario: Insufficient stock

- GIVEN total layer quantity less than the requested amount
- WHEN FIFO consumption runs
- THEN the operation is rejected with `INSUFFICIENT_STOCK` and no mutation is returned

---

### REQ-COST-005 — Behavioral parity

Both strategies MUST produce numerically IDENTICAL `unitCost` results (to 6 decimals) before and after the refactor — no rounding drift.

#### Scenario: Equivalence test passes

- GIVEN the same layer inputs fed to the pre-refactor algorithm and the new pure strategy
- WHEN both compute entry cost and exit consumption
- THEN every resulting `unitCost` is byte-identical to 6 decimals
- AND total consumed cost is identical

---

### REQ-COST-006 — Flyway migration to company_config

A Flyway migration MUST move/rename the costing method into `company_config.costing_method`, deriving a single GLOBAL value from the legacy per-product data. Value mapping MUST be: `PEPS→FIFO`, `PROMEDIO_PONDERADO→WEIGHTED_AVG`, `ESTANDAR→FIFO` (default; standard costing is unimplemented), `IDENTIFICACION_ESPECIFICA→FIFO` (specific identification approximated by FIFO layers), `YIELD_COSTING→(dropped)` — Yield Costing is a separate Desposte transformation (§COSTEO), not a global stock selector. The precedence rule for conflicting per-product values is a design decision.

#### Scenario: Legacy values mapped

- GIVEN rows with `product.costingMethod()` = `PEPS`, `PROMEDIO_PONDERADO`
- WHEN the migration runs
- THEN `company_config.costing_method` holds the canonical mapped value
- AND the per-product selector is no longer read by strategy resolution

#### Scenario: Migration idempotent

- GIVEN the migration has already been applied
- WHEN it is re-applied
- THEN no duplicate or inconsistent `company_config` rows are produced

---

### REQ-COST-007 — Orchestration boundary preserved

Repository I/O, the C1 `PESSIMISTIC_WRITE` lock (`stockJpaRepository.lockForUpdate`), and `@Transactional` MUST remain in the application orchestration layer. Domain strategies MUST be side-effect-free (no writes, no lock acquisition, no transactions).

#### Scenario: Lock and transaction stay in application

- GIVEN the PROMEDIO entry path
- WHEN `CostingService` (application) orchestrates an entry
- THEN the C1 `PESSIMISTIC_WRITE` lock is acquired before reading layers and before persisting, in the same order as today
- AND `@Transactional` wraps the application use case, not the domain strategy

#### Scenario: Domain strategy is side-effect-free

- GIVEN a `FifoCostingStrategy.consume` call
- WHEN the call completes
- THEN no persistence, lock, or transaction side-effect has occurred — only the returned result is produced

---

## MODIFIED Requirements

None.

## REMOVED Requirements

None.

## Non-goals (explicitly out of scope)

- **Yield Costing algorithm** (§COSTEO / 3-sdd_domain_logic §3) — unchanged.
- **C1 concurrency control** — the `PESSIMISTIC_WRITE` lock and retry/idempotency semantics are not modified.
- Kardex, journal entries, or MongoDB audit logging.
