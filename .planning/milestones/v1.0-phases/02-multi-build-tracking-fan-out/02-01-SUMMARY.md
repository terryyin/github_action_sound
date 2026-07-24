---
phase: 02-multi-build-tracking-fan-out
plan: 01
subsystem: monitoring
tags: [nodejs, jest, jsdom, github-actions, map]
requires:
  - phase: 01-crash-guard-status-normalization
    provides: Status normalization and null-safe scrape behavior
provides:
  - Ordered all-suite HTML snapshots through buildStates
  - Map-backed in-flight lifecycle state keyed exclusively by check-suite id
  - Injectable, ordered announcement fan-out for deterministic tests
affects: [02-02 lifecycle coverage, Phase 3 modular cleanup]
tech-stack:
  added: []
  patterns: [ordered snapshot arrays, Map-backed per-suite state, injectable announce callback]
key-files:
  created: []
  modified: [index.js, __tests__/sound-monitor.spec.js]
key-decisions:
  - "Use check-suite DOM ids as the only Map identity; titles are display-only."
  - "Treat null, empty, and all-malformed scrapes as no-ops before store mutation."
  - "Fan out descriptors synchronously in scrape order with one announce callback per descriptor."
patterns-established:
  - "Scrape all valid suite rows before passing ordered snapshots to lifecycle state."
  - "Use a fresh InFlightBuildStore and injected announce callback in poll-path tests."
requirements-completed: [MULTI-01, MULTI-02, MULTI-03, MULTI-04]
coverage:
  - id: D1
    description: "All valid check-suite rows are normalized and returned in DOM order."
    requirement: MULTI-01
    verification:
      - kind: integration
        ref: "__tests__/sound-monitor.spec.js#two-suite fan-out: scrape → Map → ordered announce"
        status: pass
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#buildStates skips malformed siblings and preserves valid DOM order"
        status: pass
    human_judgment: false
  - id: D2
    description: "Queued and running suites are independently tracked by check-suite id."
    requirement: MULTI-02
    verification:
      - kind: integration
        ref: "__tests__/sound-monitor.spec.js#two-suite fan-out: scrape → Map → ordered announce"
        status: pass
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#same-title suites remain distinct Map identities"
        status: pass
    human_judgment: false
  - id: D3
    description: "Per-suite transitions announce with the incoming run title."
    requirement: MULTI-03
    verification:
      - kind: integration
        ref: "__tests__/sound-monitor.spec.js#two-suite fan-out: scrape → Map → ordered announce"
        status: pass
    human_judgment: false
  - id: D4
    description: "Multiple suite changes fan out once each in scrape order."
    requirement: MULTI-04
    verification:
      - kind: integration
        ref: "__tests__/sound-monitor.spec.js#two-suite fan-out: scrape → Map → ordered announce"
        status: pass
    human_judgment: false
duration: 2 min
completed: 2026-07-24
status: complete
---

# Phase 2 Plan 01: Ordered Multi-Build Fan-out Summary

**All-row GitHub Actions scraping now feeds a suite-id Map and emits title-identified announcements in deterministic DOM order.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-24T08:52:00Z
- **Completed:** 2026-07-24T08:54:28Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Replaced the one-row scrape path with `buildStates`, which normalizes every valid suite row in document order and returns `null` for unusable polls.
- Replaced global singleton/blacklist tracking with `InFlightBuildStore`, a private Map keyed by check-suite id.
- Added an awaited two-suite tracer proving independent same-title admissions and ordered, title-bearing transition announcements.
- Preserved the Phase 1 status matrix while adding malformed-row isolation and null-scrape no-op coverage.

## Task Commits

1. **Task 1: End-to-end two-suite scrape → Map → ordered fan-out** - `85acdf0` (test), `c36d8ec` (feat)
2. **Task 2: Harden all-row scrape and failed-poll no-op behavior** - `6688baf` (test)

## Files Created/Modified

- `index.js` - Provides plural scraping, in-flight Map lifecycle state, and injectable ordered poll fan-out.
- `__tests__/sound-monitor.spec.js` - Provides compact multi-suite fixtures, tracer coverage, and plural scrape failure tests.

## Decisions Made

- Map identity is only the check-suite DOM id, so equal titles cannot merge lifecycle state.
- A null scrape never reaches `InFlightBuildStore.apply`, preserving existing state and suppressing announcements.
- The existing `say` implementation, import-time timer, and monolithic CommonJS structure remain unchanged for Phase 3.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None. Expected mocked network-failure tests log their caught error to stderr.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 can extend the established store with terminal retirement, re-admission, absence retention, attention/unknown, and title-refresh lifecycle tests.
- Phase 3 remains responsible for `execFile`, `require.main`, and module extraction.

## Self-Check: PASSED

- Confirmed `index.js` and `__tests__/sound-monitor.spec.js` exist.
- Confirmed task commits `85acdf0`, `c36d8ec`, and `6688baf` exist.
- Passed `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm exec jest --runInBand` (49 tests) and `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test` (49 tests).

---
*Phase: 02-multi-build-tracking-fan-out*
*Completed: 2026-07-24*
