# Phase 3: Modular Cleanup + Tech Debt - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden speech against shell injection (`execFile` argv form), stop the live poller from starting on library `require`, and split scrape / status normalization / in-flight store / announce out of the single monolith into clear modules — while preserving Phase 2 multi-build behavior and the public CLI `github_action_sound <actions-url>`. Does **not** add GitHub API auth, speech queues, URL allowlisting as a product feature, or new monitoring capabilities.

</domain>

<decisions>
## Implementation Decisions

### Carrying forward (locked — do not reopen)
- Phase 1 status enum + normalize-at-scrape-boundary; null scrape skips store update (REL-01…04)
- Phase 2 Map lifecycle: admit queued/running; terminal drop set; absence keep-until-terminal; announce on first admit; scrape/DOM fan-out order; title refresh; overlapping `say` OK (MULTI-01…06 / 02-CONTEXT D-01–D-10)
- Stay on public HTML scrape; identity = commit/run title; no API auth this milestone

### Module boundary layout
- **D-01:** Split STRUCT-01 into **four library modules** plus a thin CLI: scrape (`buildStates` + got/JSDOM), status (`Status` / `normalizeStatus` / `BuildState` + English dictionary + color/diff helpers), store (`InFlightBuildStore` + `isInFlight` / `isTerminal`), announce (`say` + ANSI/timestamp helpers used only for output). — **Reversibility:** costly — module graph and test imports all depend on the split
- **D-02:** Place modules as **root-level sibling `.js` files** (not a new `src/` tree); keep CommonJS `require`/`module.exports` to match the package. A tiny `lib/` folder is acceptable only if the planner finds root clutter harmful — default is flat root siblings. — **Reversibility:** reversible
- **D-03:** Preserve Phase 2 behavior bit-for-bit during the move — no lifecycle policy changes, no announce coalescing, no selector rewrites beyond relocating code. — **Reversibility:** costly — regressions would reopen MULTI acceptance

### CLI vs library entry (SAFE-02)
- **D-04:** Use a **separate CLI entry file** (e.g. `cli.js`) as `package.json` `bin.github_action_sound`; library/`main` entry must **not** call `setInterval` or read argv for polling on require. — **Reversibility:** costly — published bin path and consumer install expectations
- **D-05:** `package.json` `main` (and test-facing barrel, typically `index.js`) **re-exports** library symbols without side effects so `require('…')` / `require('../index')` stays usable; update `scripts.sound` to point at the CLI entry. — **Reversibility:** reversible
- **D-06:** After the split, tests must **not** need `clearInterval(timer)` solely to cancel an import-started poller; drop that mitigation once SAFE-02 holds. — **Reversibility:** reversible

### Speech argv hardening (SAFE-01)
- **D-07:** Invoke macOS speech with **`child_process.execFile('say', [sentence], …)`** (or equivalent argv form) — never interpolate scraped title/sentence text into a shell string via `exec`. — **Reversibility:** costly — security contract for SAFE-01
- **D-08:** Keep **fire-and-forget / overlapping** speech (Phase 2 MULTI-04); do not introduce a speech queue in this phase. — **Reversibility:** reversible
- **D-09:** On `say` process error, **log to stderr and continue** (same best-effort posture as today); empty sentence still short-circuits. — **Reversibility:** reversible

### Dead code / cleanup scope
- **D-10:** **Remove** the unused `japaneseDictionary` in this phase (PROJECT: unused dictionary may be removed; LOC-01 remains v2). Keep `englishDictionary` as the only wired dictionary. — **Reversibility:** reversible (can restore later for LOC-01)
- **D-11:** Do **not** expand this phase into CLI URL allowlisting, poll single-flight mutex, ESLint/syncpack CI expansion, or `who.sh` productization — those stay deferred unless cheap incidental to the split. — **Reversibility:** n/a (scope guard)

### Claude's Discretion
- Exact filenames for the four modules (e.g. `scrape.js` vs `build-states.js`)
- Whether `index.js` becomes a pure re-export barrel or retains thin orchestration helpers while CLI owns the interval
- Whether to add a focused unit test that stubs `execFile` to prove argv-form invocation
- Minimal README touch if bin path wording needs a one-line update

### Auto-mode audit log
```
[--auto] Selected all gray areas: Module boundary layout, CLI vs library entry, Speech argv hardening, Dead code / cleanup scope.

[auto] Module split — Q: "How to satisfy STRUCT-01 module boundaries?" → Selected: "Four library modules (scrape/status/store/announce) + thin CLI" (recommended default)
[auto] File layout — Q: "Root siblings vs new src/ tree?" → Selected: "Root-level CJS siblings; no src/ tree" (recommended default)
[auto] Behavior during move — Q: "Change lifecycle while splitting?" → Selected: "Bit-for-bit Phase 2 behavior preserve" (recommended default)
[auto] Entry split — Q: "require.main guard only vs separate CLI file?" → Selected: "Separate cli.js bin; library main has no poller side effect" (recommended default)
[auto] package.json — Q: "Where do main and bin point?" → Selected: "main=library barrel; bin=CLI entry; sound script → CLI" (recommended default)
[auto] Tests — Q: "Keep clearInterval afterAll for import timer?" → Selected: "Remove once library require starts no timer" (recommended default)
[auto] say invocation — Q: "How to harden speech?" → Selected: "execFile('say', [sentence]) argv form" (recommended default)
[auto] Overlap — Q: "Queue speech or keep overlapping?" → Selected: "Keep overlapping fire-and-forget" (recommended default)
[auto] say errors — Q: "Fail hard or log-and-continue?" → Selected: "Log stderr; continue" (recommended default)
[auto] japaneseDictionary — Q: "Remove or keep unused?" → Selected: "Remove unused dictionary this phase" (recommended default)
[auto] Extra debt — Q: "URL allowlist / poll mutex / lint CI in Phase 3?" → Selected: "No — defer beyond SAFE/STRUCT success criteria" (recommended default)
```

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project / requirements
- `.planning/PROJECT.md` — Constraints (macOS say, CJS, preserve CLI); unused JP dictionary may be removed; reliability-then-refactor
- `.planning/REQUIREMENTS.md` — SAFE-01, SAFE-02, STRUCT-01 (this phase); MULTI/REL already complete
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria
- `.planning/STATE.md` — Phase 2 complete; ready for Phase 3

### Prior phases
- `.planning/phases/01-crash-guard-status-normalization/01-CONTEXT.md` — Enum + crash-guard foundations; deferred execFile/module split here
- `.planning/phases/02-multi-build-tracking-fan-out/02-CONTEXT.md` — Locked Map lifecycle / fan-out; deferred SAFE/STRUCT to Phase 3
- `.planning/phases/02-multi-build-tracking-fan-out/02-VERIFICATION.md` — Phase 2 acceptance baseline that must remain green

### Codebase maps
- `.planning/codebase/CONCERNS.md` — Shell `exec` injection; import-starts-poller; monolith; unused japaneseDictionary
- `.planning/codebase/ARCHITECTURE.md` — Current poll → scrape → store → say; require-time side effects anti-pattern
- `.planning/codebase/STRUCTURE.md` — Flat package; prefer root-level CJS siblings when splitting; no inventing `src/` casually
- `.planning/codebase/STACK.md` — Node CJS, got, jsdom, Jest; `child_process.exec` today
- `.planning/codebase/TESTING.md` — Jest / got mock / clearInterval patterns to retire after SAFE-02

### Implementation sources
- `index.js` — Monolith to split: `buildStates`, `Status`/`normalizeStatus`, `BuildState`, dictionaries, `InFlightBuildStore`, `say` (`exec`), `actionSoundJob`, `setInterval` side effect
- `package.json` — `main` / `bin.github_action_sound` / `scripts.sound` must retarget per D-04/D-05
- `__tests__/sound-monitor.spec.js` — Must keep MULTI/REL coverage green; drop import-timer clear after SAFE-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildStates` — scrape-all returning `BuildState[]` or null; move to scrape module unchanged in behavior
- `Status` / `normalizeStatus` / `BuildState` / `englishDictionary` — status + announce phrasing; group in status module
- `InFlightBuildStore` / `isInFlight` / `isTerminal` — store module; keep Phase 2 predicates
- `say` — replace `exec` with `execFile`; move to announce module
- `actionSoundJob` + interval wiring — CLI-only after SAFE-02

### Established Patterns
- CommonJS throughout; Jest + `jest.mock('got')` + live-shaped aria-label fixtures
- Poll every 5s; overlapping fire-and-forget speech
- Tests currently `require('../index.js')` and `clearInterval(timer)` in `afterAll`

### Integration Points
- Retarget `package.json` `bin` / `main` / `scripts.sound`
- Update test imports if barrel export paths change; assert library require does not start network/timer
- Preserve public CLI: `github_action_sound <actions-url>`

</code_context>

<specifics>
## Specific Ideas

- Success criteria from ROADMAP: argv-form speech; library require does not start poller; scrape/status/store/announce split; CLI still works with Phase 2 behavior.
- CONCERNS already names the concrete fixes (`execFile`, `require.main` or separate CLI, module split) — decisions above pick separate CLI + root siblings as the defaults.

</specifics>

<deferred>
## Deferred Ideas

- CLI URL validation / GitHub Actions URL allowlist — CONCERNS item; not SAFE/STRUCT acceptance
- Poll single-flight mutex / chained `setTimeout` — carried from Phase 2 deferral
- Sequential speech queue or per-build voices — v2 QUEUE-01
- Japanese / multi-locale product wiring — v2 LOC-01 (dictionary removed here; restore when productized)
- ESLint / syncpack-in-CI / `who.sh` productization — quality/DX debt outside Phase 3 success criteria
- GitHub API / filters / TUI — out of scope this milestone

</deferred>

---

*Phase: 3-Modular Cleanup + Tech Debt*
*Context gathered: 2026-07-24*
