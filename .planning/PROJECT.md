# github_action_sound — Concurrent Builds Fix

## What This Is

A macOS CLI (`github_action_sound`) that polls a GitHub Actions page, scrapes every check-suite row, and announces each in-flight build's status transitions via colored stderr + `say`, identified by commit/run title. As of v1.0 it tracks all concurrent builds by suite id, survives bad polls without crashing or wiping state, and is split into scrape/status/store/announce modules behind an import-inert library barrel with `cli.js` as the only entry that starts the poller.

## Current State

**Shipped:** v1.0 Concurrent Builds Fix (2026-07-24)

- Multi-build tracking: every queued/running suite tracked by check-suite id; each meaningful transition announced with its title; terminal announce retires the id; re-admission allowed
- Crash-safe polling: scrape/network/DOM failures log and no-op without touching tracked state
- Normalized `Status` enum (queued, running, success, failure, cancelled, skipped, action_required, unknown) drives colors, speech, and lifecycle; unknown is never spoken
- Shell-safe speech via `execFile('say', [sentence])`; no scraped text through a shell string
- 300 LOC across 6 modules (`cli.js`, `index.js`, `scrape.js`, `status.js`, `store.js`, `announce.js`)

## Next Milestone Goals

Not yet defined — run `/gsd-new-milestone`. Candidate v2 themes from REQUIREMENTS archive: GitHub API/private-repo monitoring (API-01), workflow/branch filters (FILT-01), speech queue or per-build voices (QUEUE-01), TUI dashboard (TUI-01), multi-locale dictionaries (LOC-01).

## Core Value

When several workflows are in flight, **every** queued/running build’s meaningful status changes are announced — nothing important is silently dropped because only the top DOM row was watched.

## Requirements

### Validated

- ✓ Poll a public GitHub Actions URL on an interval and scrape check-suite status from HTML — existing
- ✓ Announce status transitions via macOS `say` and colored stderr — existing
- ✓ Diff successive snapshots and suppress duplicate/stale announcements for a single tracked build — existing
- ✓ Unit tests with mocked HTTP for scrape/diff behavior — existing
- ✓ CI (Jest) and npm publish via tagged release + OIDC — existing
- ✓ Track **all in-flight** builds (queued/running) concurrently by suite id; announce transitions; drop after terminal announce — v1.0
- ✓ Multiple builds changing in one poll each get their own announcement (overlapping `say`, DOM order) — v1.0
- ✓ Builds identified by scraped commit/run title, refreshed on every observation — v1.0
- ✓ Scrape-failure crash fixed: bad polls log and no-op without wiping tracked state — v1.0
- ✓ Live `aria-label` values normalized to a closed Status enum driving colors and speech — v1.0
- ✓ Monolith split into scrape/status/store/announce modules with behavior-preservation coverage — v1.0
- ✓ Tech debt cleared: import no longer starts the poller; `say` uses argv-form `execFile` — v1.0

### Active

(None — define with next milestone via `/gsd-new-milestone`)

### Out of Scope

- GitHub Checks/API authentication or private-repo scraping — keep public HTML scrape model
- Filtering by workflow name / branch beyond what’s on the watched Actions page
- Real-time WebSocket updates — remain on poll interval
- Non-macOS speech backends — `say` remains the announcer
- Japanese locale wiring as a product feature — unused dictionary may be removed or deferred, not a v1 goal
- Redesigning CLI UX / config files beyond what multi-build reliability requires

## Context

- Node CJS CLI, 300 LOC across 6 modules; Jest suite covers multi-suite scrape, per-id lifecycle, scrape-failure no-op, and status normalization against live-shaped fixtures.
- `cli.js` owns argv, store, and interval state; `index.js` is an inert public barrel with dependency-injected `actionSoundJob` composition.
- All four CONCERNS from the original codebase map are resolved: status vocabulary mismatch (Status enum), scrape crash (null no-op), shell injection in `say` (`execFile` argv), import-starts-poller (`cli.js` entry split).
- v1.0 closed with an override: Phase 1 had no formal VERIFICATION.md and no milestone audit was run (all 13 requirements checked complete; phases 2–3 passed verification).
- Tests run via nix: `nix-shell -p nodejs --run 'pnpm test'`.

## Constraints

- **Platform**: macOS `say` for speech — keep working on Mac
- **Stack**: Existing Node (≥24.12) + pnpm + Jest + got + jsdom — no stack rewrite
- **Delivery model**: npm package / bin; preserve public CLI usage `github_action_sound <actions-url>`
- **Approach**: Prefer HTML scrape continuity over introducing GitHub API auth for this milestone
- **Phasing**: Reliability before deep refactor — cleanup is same milestone, later phases

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Track all in-flight builds, not only newest | User loses failure/success signals when multiple workflows run | ✓ Good — shipped v1.0, full lifecycle matrix covered |
| Overlapping `say` allowed | Simpler than a speech queue; latency not a concern | ✓ Good — no coalescing, each change announced |
| Identify by commit/title | Matches current announcements; avoid workflow-name complexity in v1 | ✓ Good — titles refresh on every observation |
| In-flight only (queued/running → terminal → drop) | Avoid noise from historical rows on the Actions page | ✓ Good — terminal announce retires id; re-admission allowed |
| Reliability then refactor in one roadmap | Multi-build must work; cleanup reduces future breakage without blocking the fix | ✓ Good — Phase 3 extraction preserved Phase 2 behavior |
| Stay on HTML scrape | No auth/token scope for this tool’s typical use | ✓ Good — live-shaped fixtures lock the scrape contract |
| Closed status enum (8 values) with unknown-never-spoken | No `undefined` colors/phrases; silent on unrecognized labels | ✓ Good |
| Null/empty/malformed scrapes are no-ops before store mutation | Bad polls must not wipe tracked state | ✓ Good |
| Check-suite DOM ids as sole Map identity; titles display-only | Stable identity across title edits and re-runs | ✓ Good |
| Only observed terminal states retire tracked suites; absence retained | No absence-derived completion or miss-count pruning | ✓ Good |
| `execFile('say', [sentence])` argv-form speech | Scraped text never passes through a shell string | ✓ Good |
| `cli.js` owns polling lifecycle; `index.js` inert barrel | Requiring the library never starts the poller | ✓ Good |
| Phase 1 closed without formal VERIFICATION.md (override) | Plans executed and requirements checked; user accepted override at close | ⚠️ Revisit — verify crash-guard behavior if it regresses |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-24 after v1.0 milestone*
