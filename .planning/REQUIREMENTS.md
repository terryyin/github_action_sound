# Requirements: github_action_sound — Concurrent Builds Fix

**Defined:** 2026-07-24
**Core Value:** When several workflows are in flight, every queued/running build’s meaningful status changes are announced — nothing important is silently dropped because only the top DOM row was watched.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Reliability

- [x] **REL-01**: On scrape/network/DOM failure, the poll tick logs the error and skips updates without throwing or clearing in-flight state
- [x] **REL-02**: Scraped SVG `aria-label` values are normalized to a single status enum used for color, speech, and lifecycle decisions
- [x] **REL-03**: Colored stderr and spoken phrases use the normalized status enum (live GitHub labels produce correct colors and sentences)
- [x] **REL-04**: Unit tests assert against the normalized enum / live fixture labels (no synthetic dotted status strings that diverge from production)

### Concurrent Tracking

- [x] **MULTI-01**: Each poll scrapes **all** check-suite rows on the Actions page (not only the first match)
- [x] **MULTI-02**: The monitor tracks every build that is queued or currently running (in-flight), keyed by check-suite id
- [x] **MULTI-03**: When an in-flight build’s status changes, the tool announces that transition (stderr + `say`) identified by commit/run title
- [x] **MULTI-04**: When multiple in-flight builds change in one poll, each change is announced (overlapping `say` allowed; no coalescing into one summary)
- [x] **MULTI-05**: After a tracked build reaches a terminal status and is announced, it is dropped from tracking (in-flight only; no historical re-announce storm)
- [x] **MULTI-06**: A previously completed suite id may be tracked again if it reappears as queued/running (no forever blacklist)

### Safety & Structure

- [ ] **SAFE-01**: Speech invocation does not pass scraped text through a shell string (`execFile` or equivalent argv form)
- [ ] **SAFE-02**: Requiring library modules for tests does not start the live poller or network loop (`require.main` / separate CLI entry)
- [ ] **STRUCT-01**: Scrape, status normalization, in-flight store, and announce responsibilities are split out of the single monolith into clear modules after multi-build behavior is proven

## v2 Requirements

Deferred beyond this milestone.

### Monitoring

- **API-01**: Optional GitHub API / authenticated private-repo monitoring
- **FILT-01**: Workflow name / branch filters beyond the watched Actions URL
- **QUEUE-01**: Sequential speech queue or distinct voices per concurrent build
- **TUI-01**: Interactive TUI / dashboard view of in-flight runs
- **LOC-01**: Productized Japanese (or multi-locale) dictionary wiring

## Out of Scope

| Feature | Reason |
|---------|--------|
| GitHub Checks API auth / private scrape | Milestone keeps public HTML scrape model |
| Real-time WebSockets / webhooks | Remain on poll interval |
| Non-macOS speech backends | `say` remains the announcer |
| Multi-repo / org monitoring | One Actions URL per process |
| Watching completed historical rows indefinitely | Noise; in-flight only |
| Coalescing multi-build changes into one sentence | Hides which build failed |

## User Stories

- As a developer with several workflows running, I hear each in-flight build’s start/finish so I do not miss a failure on a non-top row.
- As a developer, a bad poll does not crash the monitor or wipe what I was already tracking.
- As a developer, spoken lines still name the commit/title so overlapping announcements remain identifiable.

## Acceptance Criteria

- Fixture HTML with **two** concurrent in-flight suites yields announcements for both when they finish (or change status).
- Failed `got` / missing DOM does not throw inside the interval callback; prior Map state remains.
- Live-shaped `aria-label` fixtures drive non-`undefined` colors and correct speech phrases.
- After terminal announce, the suite id is no longer tracked until it returns as in-flight.

## Definition of Done

- All v1 requirements mapped and verified in phase verification
- Automated tests cover multi-suite scrape, per-id diff/drop, scrape-failure no-op, and status normalization
- Manual smoke: watch a busy public Actions URL with ≥2 overlapping runs and hear distinct announcements

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REL-01 | Phase 1 | Complete |
| REL-02 | Phase 1 | Complete |
| REL-03 | Phase 1 | Complete |
| REL-04 | Phase 1 | Complete |
| MULTI-01 | Phase 2 | Complete |
| MULTI-02 | Phase 2 | Complete |
| MULTI-03 | Phase 2 | Complete |
| MULTI-04 | Phase 2 | Complete |
| MULTI-05 | Phase 2 | Complete |
| MULTI-06 | Phase 2 | Complete |
| SAFE-01 | Phase 3 | Pending |
| SAFE-02 | Phase 3 | Pending |
| STRUCT-01 | Phase 3 | Pending |

**Coverage:**

- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-24*
*Last updated: 2026-07-24 after Phase 2 verification*
