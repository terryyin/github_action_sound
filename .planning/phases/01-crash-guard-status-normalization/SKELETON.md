# Walking Skeleton — github_action_sound

**Phase:** 1
**Generated:** 2026-07-24

## Capability Proven End-to-End

A developer can run the existing poller against a mocked Actions HTML page and get a crash-safe tick: scrape failure returns `null` and skips update; a live-shaped SVG `aria-label` normalizes to a closed status enum that drives defined ANSI color and English speech phrasing.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js CJS (`>=24.12` engines) single-file CLI | Existing stack; reliability before module split (Phase 3) |
| HTTP / DOM | Keep `got@11.8.6` + `jsdom@26.1.0` | Project keep policy; already mocked in Jest |
| Status vocabulary | Frozen string enum + `normalizeStatus` at scrape boundary | D-03/D-04; prefix-before-colon match for live `STATUS:  Run…` labels |
| Scrape failure | `buildState` → `null`; poll `.then` early-return | D-01/D-02; no Result monad until extract |
| Announce | Existing `say` + `exec` unchanged | SAFE-01 deferred to Phase 3 |
| Tests | Jest + `jest.mock('got')`; fixtures only (no live CI fetch) | D-07/D-08 |
| Layout | Keep monolith `index.js` + `__tests__/sound-monitor.spec.js` | STRUCT-01 deferred; first-row scrape until Phase 2 |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — already present
- [x] Entry path — CLI argv Actions URL + `setInterval` poller (unchanged shape)
- [x] Data path — HTTP GET Actions HTML → JSDOM first `check_suite_*` row → enum status
- [x] Output — colored stderr + `say` driven by enum (speech spawn hardening later)
- [x] Local full-stack run — `pnpm test`; manual: `node index.js <actions-url>` on macOS

## Out of Scope (Deferred to Later Slices)

- Multi-suite `querySelectorAll` + in-flight Map (Phase 2 / MULTI-*)
- `execFile('say', …)`, `require.main` poller guard, module split (Phase 3 / SAFE-*/STRUCT-01)
- GitHub API auth / private repos
- Productized Japanese dictionary wiring

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Track all in-flight suites and announce every meaningful status change (fan-out)
- Phase 3: Safe speech argv, no import-side-effect poller, clear module boundaries
