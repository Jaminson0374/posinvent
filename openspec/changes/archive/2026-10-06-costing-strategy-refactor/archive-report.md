# Archive Report: costing-strategy-refactor (C2 — Costing Strategy Refactor)

**Change**: `costing-strategy-refactor`
**Archived**: 2026-10-06
**Artifact store**: `openspec`
**Status**: ARCHIVED (verify PASS WITH WARNINGS, no CRITICAL)

---

## Summary

Extracted the pure costing math out of `CostingService` (application) into a
`domain/service` Strategy Pattern (`CostingStrategy` + `FifoCostingStrategy` +
`WeightedAvgCostingStrategy`), reshaped the service into a thin hexagonal
`CostingOrchestrator`, and aligned the costing-method selector to the GLOBAL
`company_config.costing_method` (`FIFO` | `WEIGHTED_AVG`) via Flyway migration
V108. Repository I/O, the C1 `PESSIMISTIC_WRITE` lock, and `@Transactional` remain
in the application layer; domain strategies are JPA/Spring-free and side-effect-free.

Final state is authoritative and supersedes any intermediate snapshot.

---

## Delivery Evidence

| # | Commit | Content |
|---|--------|---------|
| 1 | `e314a2e` | Domain Strategy Pattern — `CostingStrategy`/`FifoCostingStrategy`/`WeightedAvgCostingStrategy` + pure value objects in `domain/service` (JPA/Spring-free) |
| 2 | `349a466` | `CostingOrchestrator` reshape — orchestration only; lock + `@Transactional` retained in application |
| 3 | `07b04b8` | V108 migration + selector alignment (`KardexRepositoryAdapter` `PEPS→FIFO`, `FormulaProductionUseCase` fallback `WEIGHTED_AVERAGE→FIFO`) |

Backend repo: `C:\POS_VTA\backend_pos-vta` (branch `master`).

---

## Build & Test Evidence

| Check | Result | Details |
|-------|--------|---------|
| `gradlew compileJava` | ✅ BUILD SUCCESSFUL | `C:\POS_VTA\backend_pos-vta` |
| `gradlew test` | ✅ 135 tests | 2 failures only |
| Testcontainers/Docker | ⚠️ 2 failures | Pre-existing — Docker absent locally (not introduced by this change) |

---

## Verify Verdict

**PASS WITH WARNINGS** — no CRITICAL issues.

| Requirement | Status |
|-------------|--------|
| REQ-COST-001 (pure Strategy Pattern in `domain/service`) | ✅ Verified |
| REQ-COST-002 (GLOBAL `company_config.costing_method` selector) | ✅ Verified |
| REQ-COST-003 (weighted-average recalc 6dp `HALF_UP`) | ✅ Verified |
| REQ-COST-004 (FIFO/FEFO consumption is pure) | ✅ Verified |
| REQ-COST-005 (behavioral parity, no rounding drift) | ✅ Verified |
| REQ-COST-006 (Flyway migration to `company_config`) | ✅ Verified |
| REQ-COST-007 (orchestration boundary preserved) | ✅ Verified |

---

## Follow-ups (recorded, NOT implemented in this change)

1. **V108 derivation gap (REQ-COST-006 partial).** The migration normalizes the
   `company_config.costing_method` value but omits the design's "derive global from
   per-product data" step. Mitigated by the pre-existing V62
   `NOT NULL DEFAULT 'WEIGHTED_AVERAGE'` on the column, so no null/unset state is
   reachable. A follow-up should implement the full per-product→global derivation if
   historical per-product method data must be honored.

2. **`recalculateUnitCost` duplicates weighted-average rounding logic.** It re-implements
   the `Σ(qty×cost)/Σ(qty)` 6dp `HALF_UP` math inline instead of reusing
   `WeightedAvgCostingStrategy`. Follow-up: route it through the strategy to avoid
   rounding-logic drift.

3. **Legacy `product.costingMethod` field still present.** The V18 CHECK constraint and
   `DEFAULT 'PROMEDIO_PONDERADO'` remain, and the field is still read by `Product*`
   classes. Follow-up cleanup: remove the field + CHECK after confirming no remaining
   consumers (selector now reads `company_config`).

---

## Archive Operations Performed

| Operation | Path |
|-----------|------|
| Change folder moved to archive | `openspec/changes/archive/2026-10-06-costing-strategy-refactor/` |
| Delta spec synced as new main spec (domain did not previously exist) | `openspec/specs/costeo-estrategia/spec.md` |

### Notes

- **Domain name**: the delta spec declares `**Domain**: costeo-estrategia`, and the
  change's `specs/` subfolder is likewise named `costeo-estrategia` — no discrepancy.
  The declared domain was used as the main-spec folder, consistent with the repo's
  capability-named domains (`produccion`, `pos-devoluciones`, `cxc-intereses`,
  `stock-concurrency`).
- **Sync strategy**: this is a NEW domain (no pre-existing main spec). Per convention the
  delta content was copied directly into the source-of-truth location with the title and
  header normalized (`# Delta for ...` → `# Spec: ...`, `**Change**` →
  `**Source change** ... (archived YYYY-MM-DD)`), mirroring the prior
  `harden-stock-concurrency` archive. No requirement was REMOVED or MODIFIED, so no
  destructive merge was involved.
- **Cross-cutting rename already applied**: the proposal/tasks note a docs-only rename
  `CostingService` → `CostingOrchestrator` in `openspec/specs/stock-concurrency/spec.md`
  REQ-CONC-003 (task 4.1). That edit is already present in the main spec (verified on
  disk); no additional archive-time sync was required.
- **`verify-report.md` absent on disk**: the change folder carried no `verify-report.md`
  at archive time. The verify verdict recorded above is sourced from the orchestrator's
  authoritative final-state facts (PASS WITH WARNINGS, no CRITICAL, REQ-COST-001..007
  verified). No CRITICAL issue exists to block archive.
- **Review state**: this repo's OpenSpec changes are not governed by a native review gate
  (no `review/` artifacts in this or any prior archived change; delivery was via direct
  commits to `master`). Treated as unmanaged — no terminal receipt applies.
- **Tasks gate**: all implementation tasks (`1.1`–`4.1`) are checked `[x]` in the
  archived `tasks.md`. No stale unchecked implementation tasks.

---

## Artifact Inventory (archived folder)

- `proposal.md` ✅
- `design.md` ✅
- `specs/costeo-estrategia/spec.md` ✅
- `tasks.md` ✅ (all tasks complete)
- `archive-report.md` ✅ (this file)

## Sprint/Status Tracker

`openspec/spec` (sprint tracker) was left unchanged — `costing-strategy-refactor` is a
hallazgo (C2) with no sprint slot, and no existing convention requires an entry.
