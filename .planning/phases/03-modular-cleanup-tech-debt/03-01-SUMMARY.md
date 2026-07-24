---
phase: 03-modular-cleanup-tech-debt
plan: 01
subsystem: cli-safety
tags: [node, commonjs, child-process, jest, cli]

requires:
  - phase: 02-multi-build-tracking-fan-out
    provides: ordered multi-suite scrape, store, and announcement behavior
provides:
  - argv-form macOS speech adapter
  - import-safe library entry and dedicated polling CLI
  - regression coverage for speech and package entry boundaries
affects: [03-02-module-extraction, package-consumers]

tech-stack:
  added: []
  patterns: [execFile argv boundary, side-effect-free CommonJS library, executable-only poll lifecycle]

key-files:
  created: [announce.js, cli.js]
  modified: [index.js, package.json, __tests__/sound-monitor.spec.js]

key-decisions:
  - "Keep actionSoundJob dependency-injected while cli.js owns argv, store, and interval state."
  - "Use execFile('say', [sentence], callback) to preserve asynchronous speech without a shell."

patterns-established:
  - "Library modules must not start timers, network traffic, or child processes at require time."
  - "Published executable routing is asserted through package manifest and shebang tests."

requirements-completed: [SAFE-01, SAFE-02, STRUCT-01]

coverage:
  - id: D1
    description: "Hostile announcement text crosses to macOS say as one execFile argv element."
    requirement: SAFE-01
    verification:
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#say sends hostile scraped text as one argv item"
        status: pass
    human_judgment: false
  - id: D2
    description: "Speech remains fire-and-forget, logs child-process errors, and ignores empty input."
    requirement: SAFE-01
    verification:
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#say remains asynchronous after a child-process error"
        status: pass
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#say skips empty sentences without stderr or a child process"
        status: pass
    human_judgment: false
  - id: D3
    description: "Library imports stay inert while the public CLI owns the 5-second polling lifecycle."
    requirement: SAFE-02
    verification:
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#requiring the library starts no runtime side effects or timer export"
        status: pass
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#cli owns argv, store construction, and the five-second poll interval"
        status: pass
    human_judgment: false
  - id: D4
    description: "Package main remains the library barrel and both executable routes resolve to cli.js."
    requirement: SAFE-02
    verification:
      - kind: unit
        ref: "__tests__/sound-monitor.spec.js#manifest routes library and executable entries to their contract files"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-24
status: complete
---

# Phase 03 Plan 01: Safe CLI-to-Speech Tracer Summary

**A shell-safe `execFile` speech adapter and import-safe CommonJS barrel, with `cli.js` as the sole owner of polling lifecycle and published command routing.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-24T09:33:27Z
- **Completed:** 2026-07-24T09:35:42Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Moved timestamped stderr output and macOS speech to `announce.js`, passing announcement text directly as one `execFile` argument.
- Removed require-time argv, store, and interval creation from `index.js`; `cli.js` now owns the existing five-second poller.
- Retargeted npm command routing and added regression coverage for hostile text, inert imports, overlapping best-effort speech, and CLI manifest wiring.

## Task Commits

1. **Task 1: Prove the safe CLI-to-speech path end to end** - `661a13c` (test), `a69e357` (feat)
2. **Task 2: Lock best-effort announcement and package-entry behavior** - `b19d5e3` (test)

## Files Created/Modified

- `announce.js` - timestamped stderr output plus asynchronous argv-form `say` execution.
- `cli.js` - executable-only URL, store, and interval lifecycle ownership.
- `index.js` - inert public CommonJS barrel retaining injected `actionSoundJob`.
- `package.json` - maps bin and `sound` script to `cli.js`.
- `__tests__/sound-monitor.spec.js` - SAFE-01/SAFE-02 boundary and package routing coverage.

## Decisions Made

- Kept `actionSoundJob(url, announce, store)` explicitly injected, so the library remains reusable and import-safe.
- Preserved overlapping callback-based speech and error logging; no queue or poll mutex was introduced.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`03-02-PLAN.md` can extract scrape, status, and store modules while retaining this safe CLI-to-library boundary.

## Self-Check: PASSED
