# Phase 2: Multi-Build Tracking + Fan-out - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Scrape **all** check-suite rows each poll, track every **queued/running** suite in an in-memory Map keyed by check-suite id, announce each meaningful per-id status transition (stderr + `say`, overlapping speech allowed), then **drop** after terminal announce — with re-admit if the same id returns as in-flight. Does **not** implement `execFile` speech hardening, `require.main` poller guard, or module split (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Carrying forward (locked — do not reopen)
- Track by check-suite id; announce identity = commit/run title (`PROJECT.md` / MULTI-02/03)
- Overlapping `say` OK; no coalescing multi-change into one summary (MULTI-04)
- In-flight only; no forever `previousBuildNames` blacklist; re-admit after drop (MULTI-05/06)
- Failed/null scrape: skip store update; preserve Map (Phase 1 D-01; REL-01)
- Malformed rows: skip per row; do not abort the whole scrape batch (Phase 1 D-02)
- Status enum + normalize-at-scrape-boundary remain the vocabulary for lifecycle (Phase 1 D-03–D-06)

### Suite absence policy
- **D-01:** If a tracked suite id is **missing** from a successful scrape that still returned other suites, **keep** it in the Map — do **not** treat absence as terminal and do **not** invent a finish announcement. — **Reversibility:** costly — wrong absence→terminal logic poisons lifecycle tests and user trust
- **D-02:** Empty scrape / network/DOM failure continues to return null and skip the store update entirely (Phase 1); absence policy only applies when the scrape succeeded with a suite list. — **Reversibility:** reversible
- **D-03:** No N-miss soft-delete / timeout prune in this phase — keep-until-terminal only. Optional prune is deferred. — **Reversibility:** reversible

### Admission and terminal classification
- **D-04:** **Admit** (insert into Map) only when normalized status is `queued` or `running`. Completed historical rows on the page that were never tracked stay silent. — **Reversibility:** costly — admission rules drive MULTI-02/05 and fixture expectations
- **D-05:** **Terminal** (announce once if tracked, then delete): `success`, `failure`, `cancelled`, `skipped`. — **Reversibility:** costly — drop predicates and tests depend on this set
- **D-06:** `action_required`: if already tracked, announce the transition and **keep** tracking (treat as non-terminal attention state). Do **not** admit a suite whose first sighting is only `action_required`. — **Reversibility:** reversible
- **D-07:** `unknown`: never admit; if a tracked suite becomes `unknown`, keep entry and skip speech (Phase 1 D-05). — **Reversibility:** reversible

### First-seen and fan-out behavior
- **D-08:** On first admission of a new in-flight id, **announce** (new-build + title + status phrase) — do not silent-adopt. Cold start of the monitor will speak currently queued/running suites once. — **Reversibility:** reversible
- **D-09:** When multiple tracked builds change in one poll, emit **one announcement per change** in **scrape/DOM order** (deterministic; no priority reordering; no summary coalesce). — **Reversibility:** reversible
- **D-10:** Refresh stored title/`gitLog` from each successful per-id scrape so later announces use the latest title text. — **Reversibility:** reversible

### Claude's Discretion
- Exact `InFlightBuildStore` / transition-engine API shape inside `index.js` (factory vs class) — stay in monolith until Phase 3
- Whether scrape helper is renamed `buildStates` → `BuildState[]` vs evolving `buildState` to return an array
- Whether to add a single-flight poll mutex this phase (research flags race risk; not required for MULTI acceptance if intervals stay short — planner may add a minimal guard if cheap)
- Fixture HTML layout for multi-suite cases (two concurrent in-flight + terminal flip)

### Auto-mode audit log
```
[--auto] Selected all gray areas: Suite absence policy, Admission and terminal classification, First-seen and fan-out behavior.

[auto] Suite absence — Q: "Tracked suite missing from a successful scrape?" → Selected: "Keep until terminal; never invent finish from absence" (recommended default)
[auto] Failed/empty scrape — Q: "How does absence interact with null scrape?" → Selected: "Null scrape skips store; absence only on successful suite list" (recommended default)
[auto] Soft-delete — Q: "N-miss timeout prune?" → Selected: "No — keep-until-terminal only this phase" (recommended default)
[auto] Admission — Q: "Which statuses enter the Map?" → Selected: "queued + running only" (recommended default)
[auto] Terminal set — Q: "What drops after announce?" → Selected: "success, failure, cancelled, skipped" (recommended default)
[auto] action_required — Q: "How to treat action_required?" → Selected: "Announce if tracked; keep tracking; do not first-admit" (recommended default)
[auto] unknown — Q: "How to treat unknown while tracked?" → Selected: "Keep; skip speech" (recommended default)
[auto] First-seen — Q: "Silent adopt or announce on admit?" → Selected: "Announce on first admission" (recommended default)
[auto] Fan-out order — Q: "Order when multiple change in one poll?" → Selected: "Scrape/DOM order; one announce each" (recommended default)
[auto] Title refresh — Q: "Freeze title or refresh from scrape?" → Selected: "Refresh title each successful scrape" (recommended default)
```

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project / requirements
- `.planning/PROJECT.md` — Core value; track-all / overlapping say / title identity / in-flight-only decisions
- `.planning/REQUIREMENTS.md` — MULTI-01…MULTI-06 (this phase); SAFE/STRUCT are Phase 3
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria
- `.planning/STATE.md` — Open concern: absence policy when tracked suite vanishes without terminal

### Research
- `.planning/research/SUMMARY.md` — Map lifecycle; scrape-all/track-few; vanished-row default keep-on-empty
- `.planning/research/ARCHITECTURE.md` — `querySelectorAll` → normalize → InFlightBuildStore → fan-out; absence edge case
- `.planning/research/PITFALLS.md` — First-row scrape; forever blacklist; title-as-key; absence≠terminal; overlapping poll races
- `.planning/research/FEATURES.md` — In-flight discovery/tracking/retirement model

### Prior phase
- `.planning/phases/01-crash-guard-status-normalization/01-CONTEXT.md` — D-01–D-08 crash guard + enum foundations
- `.planning/phases/01-crash-guard-status-normalization/SKELETON.md` — Explicit deferral of multi-suite Map to Phase 2

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` — Current poll → scrape → MostRecentUpdate → say loop
- `.planning/codebase/INTEGRATIONS.md` — Selectors: `[id^='check_suite_']`, `svg[aria-label]`, `span.Link--primary`
- `.planning/codebase/TESTING.md` — Jest / got mock / clearInterval patterns
- `.planning/codebase/CONCERNS.md` — First-row scrape; forever blacklist; status vocabulary (Phase 1 partially fixed)

### Implementation sources
- `index.js` — `buildState` (still `querySelector` first row), `Status`/`normalizeStatus`, `BuildState`, `MostRecentUpdate` (replace), `actionSoundJob`, `say`
- `__tests__/sound-monitor.spec.js` — Extend with multi-suite HTML fixtures and Map lifecycle expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Status` + `normalizeStatus` — lifecycle predicates must use these enum values
- `BuildState` + `diffToSentence` / `colorCode` / `englishDictionary` — reuse per-id; fan-out calls announce path N times
- `buildState` — evolve to scrape-all (`querySelectorAll`) returning `BuildState[]` or null on total failure
- Null-safe `actionSoundJob` guard — keep; apply to multi-suite store update skip

### Established Patterns
- Poll every 5s; import still starts timer (clear in `afterAll` until Phase 3)
- Jest + `jest.mock('got')` + live-shaped aria-label fixtures (Phase 1 D-07/D-08)
- Fire-and-forget `say` (shell `exec` remains until Phase 3 SAFE-01)

### Integration Points
- Replace `MostRecentUpdate` + `previousBuildNames` with Map-backed in-flight store at the poll `.then` site
- Retire forever-blacklist semantics that mute re-runs of the same suite id
- Tests must cover: two concurrent in-flight finishes; terminal drop; re-admit; absence-without-terminal keep; null scrape preserves Map

</code_context>

<specifics>
## Specific Ideas

- Acceptance fixture: HTML with **two** concurrent in-flight suites; both get announcements when they finish or change (REQUIREMENTS Acceptance Criteria).
- Research default for vanished rows is keep-until-terminal — locked here as D-01 after STATE flagged the open question.
- Speech queues / distinct voices remain v2 (`QUEUE-01`); overlapping `say` stays the product choice.

</specifics>

<deferred>
## Deferred Ideas

- `execFile('say', …)`, `require.main` poller guard, scrape/status/store/announce module split — Phase 3 (SAFE-01/02, STRUCT-01)
- N-miss soft-delete / bounded prune for long-running monitors — optional later; not MULTI acceptance
- Sequential speech queue or per-build voices — v2 QUEUE-01
- Poll single-flight mutex / chained `setTimeout` — cleanup/hardening if not cheaply included in Phase 2
- GitHub API / filters / TUI — out of scope this milestone

</deferred>

---
*Phase: 2-Multi-Build Tracking + Fan-out*
*Context gathered: 2026-07-24*
