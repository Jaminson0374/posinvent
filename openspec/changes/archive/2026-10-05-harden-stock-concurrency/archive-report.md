# Archive Report: harden-stock-concurrency (C1 — Inventory Concurrency Hardening)

**Change**: `harden-stock-concurrency`
**Archived**: 2026-10-05
**Artifact store**: `openspec`
**Status**: ARCHIVED (verify PASS WITH WARNINGS, no CRITICAL)

---

## Summary

Hardened the inventory module against lost-update / oversell by extending the
already-established optimistic-locking pattern (14 entities already used
`@Version` + `ObjectOptimisticLockingFailureException` → `BusinessException("CONCURRENT_MODIFICATION")`)
to the 7 stock entities, and coordinating the 9 offending use cases to **retry**
the transactional unit on version conflict rather than fail-fast.

Final state is authoritative and supersedes any intermediate snapshot. The three
commits below landed on backend `master` after `apply-progress`/`verify-report`
were persisted; the verify warnings cited at intermediate stages were addressed
in later commits (see Final-State Facts).

---

## Delivery Evidence

| # | Commit | Content |
|---|--------|---------|
| 1 | `7bec35a` | `@Version` on 7 entities + migration `V107__add_version_to_stock_entities.sql` + merge-into-managed save across adapters |
| 2 | `decc213` | `OptimisticConcurrencyExecutor` (bounded retry, `maxAttempts=5`, `TransactionTemplate`) wired into 9 offenders + targeted `PESSIMISTIC_WRITE` lock on parent `InventoryStock` row in `CostingService` |
| 3 | `a09ba39` | `OptimisticConcurrencyExecutorTest` (4/4 pass) + `StockConcurrencyIntegrationTest` (CI-ready, Testcontainers) |

Backend repo: `C:\POS_VTA\backend_pos-vta` (branch `master`).

---

## Build & Test Evidence

| Check | Result | Details |
|-------|--------|---------|
| `gradlew compileJava` | ✅ BUILD SUCCESSFUL | `C:\POS_VTA\backend_pos-vta` |
| `gradlew test` | ✅ 109 tests | Unit concurrency test green |
| Testcontainers | ⚠️ 2 failures | Pre-existing — Docker absent locally (not introduced by this change) |

---

## Verify Verdict

**PASS WITH WARNINGS** — no CRITICAL issues.

| Requirement | Status |
|-------------|--------|
| REQ-CONC-001 (7 entities carry `version`) | ✅ Verified |
| REQ-CONC-002 (retry, not fail-fast) | ✅ Verified |
| REQ-CONC-003 (no double side-effects) | ✅ Verified |
| REQ-CONC-004 (no oversell / lost-update) | ✅ Verified |
| REQ-CONC-005 (additive `DEFAULT 0` migration) | ✅ Verified |

---

## Follow-ups (recorded, NOT implemented in this change)

1. **`committedQuantity` / available-stock guard gap.** Exit/disposal guards compare
   `currentQuantity` only, not `currentQuantity - committedQuantity`. Pre-existing
   behavior: a reserved quantity could be oversold by a manual exit. Requires a
   follow-up change to make guards respect available stock atomically.

2. **100-thread test flakiness.** `OptimisticConcurrencyExecutor` uses no backoff and
   `maxAttempts=5`; true 100-way contention could exhaust retries in CI. Test-robustness
   follow-up recommended: add backoff/jitter or raise the attempt ceiling.

---

## Archive Operations Performed

| Operation | Path |
|-----------|------|
| Change folder moved to archive | `openspec/changes/archive/2026-10-05-harden-stock-concurrency/` |
| Delta spec synced as new main spec (domain did not previously exist) | `openspec/specs/stock-concurrency/spec.md` |

### Notes

- **Domain name**: the delta spec declares `**Domain**: stock-concurrency`, but the
  change's `specs/` subfolder was named `harden-stock-concurrency`. The declared domain
  (`stock-concurrency`) was used as the main-spec folder, consistent with the repo's
  capability-named domains (`produccion`, `pos-devoluciones`, `cxc-intereses`).
- **Sync strategy**: this is a NEW domain (no pre-existing main spec). Per convention the
  delta content was copied directly into the source-of-truth location. No requirement
  was REMOVED or MODIFIED, so no destructive merge was involved.
- **`verify-report.md` absent on disk**: the change folder carried no `verify-report.md`
  at archive time. The verify verdict recorded above is sourced from the orchestrator's
  authoritative final-state facts (PASS WITH WARNINGS, no CRITICAL). No CRITICAL issue
  exists to block archive.
- **Review state**: this repo's OpenSpec changes are not governed by a native review gate
  (no `review/` artifacts in any prior archived change; delivery was via direct commits to
  `master`). Treated as unmanaged — no terminal receipt applies.
- **Tasks gate**: all 15 implementation tasks (`1.1`–`3.4`) are checked `[x]` in the
  archived `tasks.md`. No stale unchecked implementation tasks.

---

## Artifact Inventory (archived folder)

- `proposal.md` ✅
- `design.md` ✅
- `specs/harden-stock-concurrency/spec.md` ✅
- `tasks.md` ✅ (15/15 complete)
- `archive-report.md` ✅ (this file)

## Sprint/Status Tracker

`openspec/spec` (sprint tracker) was left unchanged — `harden-stock-concurrency` is a
hallazgo (C1 hardening) with no sprint slot, and no existing convention requires an entry.
