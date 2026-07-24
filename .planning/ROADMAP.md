# Roadmap: github_action_sound — Concurrent Builds Fix

## Overview

Harden the existing macOS Actions poller so scrape failures and live status labels are trustworthy, then track every in-flight check suite and announce each transition, and finally split the monolith into safe, testable modules without changing the public CLI.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Crash Guard + Status Normalization** - Safe poll ticks and a single status enum for color, speech, and lifecycle
- [ ] **Phase 2: Multi-Build Tracking + Fan-out** - Track all in-flight suites and announce every meaningful change
- [ ] **Phase 3: Modular Cleanup + Tech Debt** - Safe `say`, no import-side-effect poller, clear module boundaries

## Phase Details

### Phase 1: Crash Guard + Status Normalization

**Goal:** As a developer watching GitHub Actions, I want bad polls and live status labels to stay crash-safe and enum-normalized, so that colors and speech stay defined without wiping prior state.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** REL-01, REL-02, REL-03, REL-04
**Success Criteria** (what must be TRUE):

  1. When scrape/network/DOM fails, the poll interval keeps running, logs the error, and leaves prior in-flight state untouched
  2. Live-shaped SVG `aria-label` values map to a closed status enum used for color, speech phrasing, and later lifecycle predicates
  3. Colored stderr and spoken phrases reflect that enum (no `undefined` color/phrase for known live labels)
  4. Unit tests assert against the normalized enum / live fixture labels rather than synthetic dotted status strings

**Plans:** 2/2 plans executed

Plans:

- [x] 01-01-PLAN.md — Tracer: null-safe scrape + Status enum through success color/speech
- [x] 01-02-PLAN.md — Full status mapping, unknown skip, live-shaped fixtures (REL-02/03/04)

### Phase 2: Multi-Build Tracking + Fan-out

**Goal:** With several workflows in flight, the developer hears each queued/running build’s meaningful status changes (identified by commit/run title), including when multiple change in one poll — then tracking drops after terminal announce.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** MULTI-01, MULTI-02, MULTI-03, MULTI-04, MULTI-05, MULTI-06
**Success Criteria** (what must be TRUE):

  1. Each poll scrapes every check-suite row on the Actions page (not only the first DOM match)
  2. Every queued/running suite is tracked by check-suite id; terminal announce then removes it from tracking
  3. When an in-flight build’s status changes, stderr + `say` announce that transition using the commit/run title
  4. When multiple in-flight builds change in one poll, each change is announced (overlapping `say` allowed; no single summary coalescing)
  5. A previously completed suite id can be tracked again if it reappears as queued/running (no forever blacklist)

**Plans:** 2/2 plans executed

Plans:

- [x] 02-01-PLAN.md — Tracer: all-suite scrape, per-id Map tracking, and ordered two-suite fan-out
- [x] 02-02-PLAN.md — Full lifecycle matrix: terminal retirement, absence retention, re-admission, attention/unknown, and title refresh

### Phase 3: Modular Cleanup + Tech Debt

**Goal:** After multi-build behavior is proven, scraped titles cannot hit a shell, requiring library code does not start the live poller, and scrape/status/store/announce live in clear modules.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** SAFE-01, SAFE-02, STRUCT-01
**Success Criteria** (what must be TRUE):

  1. Speech uses argv-form invocation (`execFile` or equivalent) so scraped title text never goes through a shell string
  2. Requiring library modules from tests does not start the live poller or network loop
  3. Scrape, status normalization, in-flight store, and announce responsibilities are split out of the single monolith into clear modules
  4. Public CLI usage `github_action_sound <actions-url>` still works with Phase 2 behavior intact

**Plans:** TBD

Plans:

- [ ] 03-01: TBD (defined during planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Crash Guard + Status Normalization | 2/2 | In Progress|  |
| 2. Multi-Build Tracking + Fan-out | 2/2 | In Progress|  |
| 3. Modular Cleanup + Tech Debt | 0/TBD | Not started | - |

---
*Roadmap created: 2026-07-24*
*Granularity: standard (3 phases — reliability → multi-build → cleanup)*
