# github_action_sound — Concurrent Builds Fix

## What This Is

A macOS CLI (`github_action_sound`) that polls a GitHub Actions page, scrapes check-suite status, and announces changes via stderr + `say`. This milestone makes the monitor correct when **multiple builds run at once**, then hardens and cleans up the codebase so that behavior stays reliable.

## Core Value

When several workflows are in flight, **every** queued/running build’s meaningful status changes are announced — nothing important is silently dropped because only the top DOM row was watched.

## Requirements

### Validated

- ✓ Poll a public GitHub Actions URL on an interval and scrape check-suite status from HTML — existing
- ✓ Announce status transitions via macOS `say` and colored stderr — existing
- ✓ Diff successive snapshots and suppress duplicate/stale announcements for a single tracked build — existing
- ✓ Unit tests with mocked HTTP for scrape/diff behavior — existing
- ✓ CI (Jest) and npm publish via tagged release + OIDC — existing

### Active

- [ ] Track **all in-flight** builds (queued/running) concurrently; announce when each finishes, then stop tracking it
- [ ] Fire announcements immediately when multiple builds change (overlapping `say` is acceptable)
- [ ] Keep identifying builds by scraped commit/run title (current style)
- [ ] Fix scrape-failure crash (`undefined` state into the update path)
- [ ] Normalize status strings so live `aria-label` values drive colors and speech consistently
- [ ] Refactor the single-file monolith into clearer modules after the reliability work lands
- [ ] Reduce related tech debt that blocks safe multi-build behavior (poller import side effect, unsafe `say` shelling, etc. as needed for the cleanup phases)

### Out of Scope

- GitHub Checks/API authentication or private-repo scraping — keep public HTML scrape model
- Filtering by workflow name / branch beyond what’s on the watched Actions page
- Real-time WebSocket updates — remain on poll interval
- Non-macOS speech backends — `say` remains the announcer
- Japanese locale wiring as a product feature — unused dictionary may be removed or deferred, not a v1 goal
- Redesigning CLI UX / config files beyond what multi-build reliability requires

## Context

- Brownfield Node CJS CLI; scrape + domain + poller live in `index.js`.
- Today `buildState` uses `querySelector` (first check suite only). Concurrent runs are missed or confuse `MostRecentUpdate`.
- Codebase map already exists under `.planning/codebase/` (including CONCERNS: status vocabulary mismatch, scrape crash, shell injection in `say`, import-starts-poller).
- Desired behavior from questioning:
  1. Track all in-flight builds and announce each
  2. Overlapping speech OK
  3. Identity = commit/title
  4. In-flight only (drop after terminal status)
  5. One milestone, sequential phases: reliability (multi-build + crash/status) → broader cleanup/refactor

## Constraints

- **Platform**: macOS `say` for speech — keep working on Mac
- **Stack**: Existing Node (≥24.12) + pnpm + Jest + got + jsdom — no stack rewrite
- **Delivery model**: npm package / bin; preserve public CLI usage `github_action_sound <actions-url>`
- **Approach**: Prefer HTML scrape continuity over introducing GitHub API auth for this milestone
- **Phasing**: Reliability before deep refactor — cleanup is same milestone, later phases

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Track all in-flight builds, not only newest | User loses failure/success signals when multiple workflows run | — Pending |
| Overlapping `say` allowed | Simpler than a speech queue; latency not a concern | — Pending |
| Identify by commit/title | Matches current announcements; avoid workflow-name complexity in v1 | — Pending |
| In-flight only (queued/running → terminal → drop) | Avoid noise from historical rows on the Actions page | — Pending |
| Reliability then refactor in one roadmap | Multi-build must work; cleanup reduces future breakage without blocking the fix | — Pending |
| Stay on HTML scrape | No auth/token scope for this tool’s typical use | — Pending |

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
*Last updated: 2026-07-24 after initialization*
