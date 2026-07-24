# Phase 1: Crash Guard + Status Normalization - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make poll ticks **safe on scrape/network/DOM failure** and introduce a **single status enum** derived from live SVG `aria-label` values so color, speech phrasing, and (later) in-flight lifecycle predicates share one vocabulary. Does **not** implement multi-suite scrape or the in-flight Map (Phase 2) or module split / `execFile` (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Scrape failure behavior
- **D-01:** On scrape/network/DOM failure, log the error and **skip the update path entirely** — do not throw, do not clear or mutate last-known state. — **Reversibility:** reversible
- **D-02:** Malformed individual rows (when multi-row scrape appears later) should be skippable per row; Phase 1 at minimum must not pass `undefined` into `MostRecentUpdate` / equivalent. — **Reversibility:** reversible

### Status normalization
- **D-03:** Normalize at the scrape boundary: map raw `aria-label` → closed enum before `colorCode`, `diffToSentence`, or any lifecycle check. — **Reversibility:** costly — color/speech/diff all depend on the enum shape
- **D-04:** Enum must cover at least: queued, running, success, failure; include cancelled and skipped if fixture/live labels expose them; map unrecognized labels to `unknown`. — **Reversibility:** costly — expanding/renaming enum touches tests and announce paths
- **D-05:** `unknown` must not crash; skip speech/color announcement when there is no meaningful mapped transition (e.g. unknown→unknown). Prefer logging over inventing phrases. — **Reversibility:** reversible
- **D-06:** Drive ANSI colors and English speech phrases from the enum only — retire the mismatched `'queued: '` / dotted test literals. — **Reversibility:** costly — tests and dictionaries rewrite together

### Testing / fixtures
- **D-07:** Unit tests assert against normalized enum + live-shaped fixture `aria-label` strings (expand the existing JSDOM fixture as needed). No CI dependency on live GitHub fetches. — **Reversibility:** reversible
- **D-08:** Keep Jest + `jest.mock('got')` pattern; clearInterval of the import-side-effect timer remains required until Phase 3. — **Reversibility:** reversible

### Claude's Discretion
- Exact enum member names and mapping table for known GitHub labels
- Whether `buildState` returns `null` vs a Result type for failure (planner/researcher choose)
- Minimal wording tweaks to English dictionary once enum is fixed

### Auto-mode audit log
```
[--auto] Selected all gray areas: Scrape failure behavior, Status normalization, Testing/fixtures.

[auto] Scrape failure — Q: "What should a failed poll do?" → Selected: "Log + skip update; preserve last state" (recommended default)
[auto] Status enum — Q: "Where does normalization live?" → Selected: "At scrape boundary before color/speech/diff" (recommended default)
[auto] Unknown labels — Q: "How to handle unrecognized aria-labels?" → Selected: "Map to unknown; no crash; skip meaningless announce" (recommended default)
[auto] Fixtures — Q: "Live fetch in CI?" → Selected: "No — live-shaped HTML fixtures only" (recommended default)
[auto] Scope — Q: "Include execFile say / module split?" → Selected: "No — Phase 3" (recommended default)
```

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project / requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions (HTML scrape, reliability then refactor)
- `.planning/REQUIREMENTS.md` — REL-01…REL-04 (this phase); MULTI/SAFE/STRUCT are later phases
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria
- `.planning/research/SUMMARY.md` — Stack keep policy; normalize-at-boundary; crash guard first
- `.planning/research/PITFALLS.md` — Undefined scrape crash; status vocabulary mismatch; fixture drift
- `.planning/research/ARCHITECTURE.md` — Normalize placement; reliability-before-multi-build build order

### Codebase maps
- `.planning/codebase/CONCERNS.md` — Known scrape crash + status vocabulary bug details
- `.planning/codebase/ARCHITECTURE.md` — Current poll → scrape → diff → say loop
- `.planning/codebase/TESTING.md` — Jest / fixture patterns

### Implementation sources
- `index.js` — `buildState`, `BuildState.colorCode` / `diffToSentence`, `actionSoundJob`, dictionaries
- `__tests__/sound-monitor.spec.js` — Current fixture and dotted-status test literals to replace

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildState(url)` — scrape entry; change return on failure and add normalize step
- `BuildState` — keep shape; status field should become enum (or store both raw+enum only if needed; prefer enum-only after normalize)
- `englishDictionary` — remap phrase keys to enum values
- Fixture HTML in `__tests__/sound-monitor.spec.js` — extend with additional aria-label variants

### Established Patterns
- Poll every 5s via `setInterval`; import starts timer (clear in `afterAll`)
- `got` + JSDOM `querySelector` (still first-row in Phase 1 — multi-row is Phase 2)
- Tests mock `got` and construct `BuildState` directly for diff logic

### Integration Points
- `actionSoundJob` `.then` handler must guard `undefined`/`null` before calling update/say
- `colorCode()` and `diffToSentence` must consume enum, not raw aria-label strings

</code_context>

<specifics>
## Specific Ideas

- Overlapping `say` and multi-build Map are Phase 2 — Phase 1 only makes the foundations trustworthy for a single scraped suite (still first row) plus failure-safe polling.
- Identity remains commit/title when announcements fire; Phase 1 should not change sentence style beyond status phrase correctness.

</specifics>

<deferred>
## Deferred Ideas

- Multi-suite `querySelectorAll` + InFlightBuildStore — Phase 2
- `execFile('say', …)`, `require.main` poller guard, module split — Phase 3
- Cancelled/skipped announce policy beyond “map if present in labels” — refine in Phase 2 if needed
- Recapture fresh live Actions HTML for aria-label matrix — do during Phase 1/2 planning research if fixtures incomplete

</deferred>

---
*Phase: 1-Crash Guard + Status Normalization*
*Context gathered: 2026-07-24*
