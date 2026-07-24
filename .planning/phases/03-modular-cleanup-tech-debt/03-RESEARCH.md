# Phase 03: Modular Cleanup + Tech Debt - Research

**Researched:** 2026-07-24  
**Domain:** CommonJS CLI separation, safe child-process invocation, and behavior-preserving module extraction  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carrying forward (locked — do not reopen)
- Phase 1 status enum + normalize-at-scrape-boundary; null scrape skips store update (REL-01…04)
- Phase 2 Map lifecycle: admit queued/running; terminal drop set; absence keep-until-terminal; announce on first admit; scrape/DOM fan-out order; title refresh; overlapping `say` OK (MULTI-01…06 / 02-CONTEXT D-01–D-10)
- Stay on public HTML scrape; identity = commit/run title; no API auth this milestone

#### Module boundary layout
- **D-01:** Split STRUCT-01 into **four library modules** plus a thin CLI: scrape (`buildStates` + got/JSDOM), status (`Status` / `normalizeStatus` / `BuildState` + English dictionary + color/diff helpers), store (`InFlightBuildStore` + `isInFlight` / `isTerminal`), announce (`say` + ANSI/timestamp helpers used only for output). — **Reversibility:** costly — module graph and test imports all depend on the split
- **D-02:** Place modules as **root-level sibling `.js` files** (not a new `src/` tree); keep CommonJS `require`/`module.exports` to match the package. A tiny `lib/` folder is acceptable only if the planner finds root clutter harmful — default is flat root siblings. — **Reversibility:** reversible
- **D-03:** Preserve Phase 2 behavior bit-for-bit during the move — no lifecycle policy changes, no announce coalescing, no selector rewrites beyond relocating code. — **Reversibility:** costly — regressions would reopen MULTI acceptance

#### CLI vs library entry (SAFE-02)
- **D-04:** Use a **separate CLI entry file** (e.g. `cli.js`) as `package.json` `bin.github_action_sound`; library/`main` entry must **not** call `setInterval` or read argv for polling on require. — **Reversibility:** costly — published bin path and consumer install expectations
- **D-05:** `package.json` `main` (and test-facing barrel, typically `index.js`) **re-exports** library symbols without side effects so `require('…')` / `require('../index')` stays usable; update `scripts.sound` to point at the CLI entry. — **Reversibility:** reversible
- **D-06:** After the split, tests must **not** need `clearInterval(timer)` solely to cancel an import-started poller; drop that mitigation once SAFE-02 holds. — **Reversibility:** reversible

#### Speech argv hardening (SAFE-01)
- **D-07:** Invoke macOS speech with **`child_process.execFile('say', [sentence], …)`** (or equivalent argv form) — never interpolate scraped title/sentence text into a shell string via `exec`. — **Reversibility:** costly — security contract for SAFE-01
- **D-08:** Keep **fire-and-forget / overlapping** speech (Phase 2 MULTI-04); do not introduce a speech queue in this phase. — **Reversibility:** reversible
- **D-09:** On `say` process error, **log to stderr and continue** (same best-effort posture as today); empty sentence still short-circuits. — **Reversibility:** reversible

#### Dead code / cleanup scope
- **D-10:** **Remove** the unused `japaneseDictionary` in this phase (PROJECT: unused dictionary may be removed; LOC-01 remains v2). Keep `englishDictionary` as the only wired dictionary. — **Reversibility:** reversible (can restore later for LOC-01)
- **D-11:** Do **not** expand this phase into CLI URL allowlisting, poll single-flight mutex, ESLint/syncpack CI expansion, or `who.sh` productization — those stay deferred unless cheap incidental to the split. — **Reversibility:** n/a (scope guard)

### Claude's Discretion
- Exact filenames for the four modules (e.g. `scrape.js` vs `build-states.js`)
- Whether `index.js` becomes a pure re-export barrel or retains thin orchestration helpers while CLI owns the interval
- Whether to add a focused unit test that stubs `execFile` to prove argv-form invocation
- Minimal README touch if bin path wording needs a one-line update

### Deferred Ideas (OUT OF SCOPE)
- CLI URL validation / GitHub Actions URL allowlist — CONCERNS item; not SAFE/STRUCT acceptance
- Poll single-flight mutex / chained `setTimeout` — carried from Phase 2 deferral
- Sequential speech queue or per-build voices — v2 QUEUE-01
- Japanese / multi-locale product wiring — v2 LOC-01 (dictionary removed here; restore when productized)
- ESLint / syncpack-in-CI / `who.sh` productization — quality/DX debt outside Phase 3 success criteria
- GitHub API / filters / TUI — out of scope this milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | Speech invocation never passes scraped text through a shell string. | Put `say` in `announce.js`; use `execFile('say', [sentence], callback)` and unit-test the exact executable and argv. |
| SAFE-02 | Requiring library modules must not start a poller or network loop. | Make `index.js` a side-effect-free barrel/thin composition helper; put argv reads and `setInterval` exclusively in `cli.js`; remove timer cleanup from tests. |
| STRUCT-01 | Scrape, status normalization, in-flight store, and announce responsibilities are clear modules. | Extract four root-level CJS siblings with one-way dependencies, preserving existing Phase 2 APIs and semantics. |
</phase_requirements>

## Summary

This is a constrained extraction, not a redesign. The current `index.js` already contains the target seams: scrape (`got` + `JSDOM`), status/domain (`Status`, `normalizeStatus`, `BuildState`, English phrases), store (Map lifecycle), and announce (ANSI, timestamp, speech). Move those blocks unchanged into four root-level CommonJS modules, then retain only dependency composition and exports in `index.js`. [VERIFIED: codebase inspection]

`execFile` is the appropriate Node API because it runs the executable directly without a shell by default and accepts arguments as a string array. Keep the sentence as one array item, never enable `shell`, retain the empty-sentence return, and log callback errors without awaiting speech; this preserves fire-and-forget overlap. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md]

The CLI must become the only process-lifecycle owner. `cli.js` reads the Actions URL, creates the store, invokes the job immediately only if existing behavior requires it (the current behavior starts on the 5-second interval), and schedules the interval. `index.js` must not read `process.argv`, construct a timer, invoke `got`, or invoke `say` while being required. [CITED: https://github.com/nodejs/node/blob/main/doc/api/modules.md]

**Primary recommendation:** Extract four root-level CJS modules, keep `index.js` import-safe with a small injected-dependency `actionSoundJob`, and make `cli.js` the package bin and sole interval owner.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Parse public Actions HTML into snapshots | CLI / local integration | External GitHub HTML | `scrape.js` owns HTTP and DOM adaptation; it returns only normalized snapshots. |
| Normalize status, sentence, and color | Local domain library | — | `status.js` owns canonical status vocabulary and presentation descriptors without I/O. |
| Track per-suite lifecycle | Local domain library | — | `store.js` owns the in-memory Map and Phase 2 admission/retirement rules. |
| Write announcements and start speech | Local side-effect adapter | macOS `say` | `announce.js` owns stderr and the child process boundary. |
| Parse argv and schedule polling | CLI entry | Local domain library | `cli.js` alone creates the persistent process lifecycle. |

## Project Constraints (from .cursor/rules/)

- The release tag is the sole version source; do not add another version source. [VERIFIED: .cursor/rules/release.mdc]
- Maintain Keep a Changelog only when cutting a release; this refactor does not itself require a release action. [VERIFIED: .cursor/rules/release.mdc]
- Release publishing uses npm Trusted Publishing/OIDC; do not introduce an `NPM_TOKEN`. [VERIFIED: .cursor/rules/release.mdc]
- No project-local skills were found under `.cursor/skills/` or `.agents/skills/`. [VERIFIED: workspace discovery]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js CommonJS | project engine `>=24.12` | Module loading, `child_process.execFile`, CLI execution | Existing package/runtime contract; no module-system migration is in scope. [VERIFIED: package.json] |
| Node `child_process.execFile` | built-in | Invoke `say` with argv | Direct execution without a shell by default. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |
| got | `11.8.6` (locked) | Existing Actions-page HTTP fetch | Preserve the existing CJS-compatible fetch path exactly. [VERIFIED: package.json] |
| jsdom | `26.1.0` (locked) | Existing DOM scrape | Preserve selectors and fixtures exactly. [VERIFIED: package.json] |
| Jest | `30.2.0` (locked) | Regression and boundary tests | Existing test runner and mocking model. [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pnpm | project engine `>=10.31` | Script execution | Use the existing lockfile and scripts; no dependency changes are planned. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `cli.js` | `require.main === module` guard in `index.js` | Node documents the guard, but D-04 locks a separately published CLI entry, which makes the library entry unambiguously import-safe. [CITED: https://github.com/nodejs/node/blob/main/doc/api/modules.md] |
| `execFile` | `spawn` | Both can avoid a shell, but D-07 explicitly selects `execFile` and its callback matches current best-effort error logging. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |

**Installation:** None. This phase must not add packages. [VERIFIED: 03-CONTEXT.md D-11]

## Architecture Patterns

### System Architecture Diagram

```text
github_action_sound <actions-url>
            |
            v
      cli.js (argv + setInterval only)
            |
            v
 index.js actionSoundJob(url, announce, store)
       |              |                 |
       v              v                 v
 scrape.js        announce.js       store.js <---- status.js
 got + JSDOM      stderr +          Map lifecycle       ^
     |            execFile('say',     + descriptors     |
     v              [sentence])                       |
 GitHub Actions HTML -----------------> BuildState / normalized Status
```

### Recommended Project Structure

```text
index.js          # side-effect-free barrel plus thin actionSoundJob composition
cli.js            # shebang, argv read, store creation, interval scheduling
scrape.js         # buildStates(url): got + JSDOM + BuildState construction
status.js         # Status, normalizeStatus, BuildState, englishDictionary
store.js          # InFlightBuildStore, isInFlight, isTerminal
announce.js       # say, now, ANSI output helpers, execFile boundary
__tests__/
└── sound-monitor.spec.js
```

### Pattern 1: One-way dependency graph

**What:** `status.js` is foundational; `scrape.js` and `store.js` import it; `announce.js` imports no domain code; `index.js` composes the four modules; `cli.js` imports only from `index.js`. [VERIFIED: phase design derived from D-01 through D-05]

**When to use:** Always in this extraction. It prevents cycles and ensures importing the library does not create a process lifecycle.

**Example:**

```javascript
// Source: existing actionSoundJob behavior, reorganized
const actionSoundJob = async (url, announce, store) => {
  const states = await buildStates(url);
  if (states == null) return [];
  const announcements = store.apply(states);
  for (const { statement, colorCode } of announcements) {
    announce(statement, colorCode);
  }
  return announcements;
};
```

### Pattern 2: Explicit CLI lifecycle ownership

**What:** `cli.js` creates the store and timer; `index.js` exports reusable symbols but starts nothing.

**When to use:** The only supported CLI entry is the `bin.github_action_sound` target and `scripts.sound`; imports are library use.

**Example:**

```javascript
// Source: Node CommonJS entry-point guidance
const { actionSoundJob, InFlightBuildStore, say } = require('./index');
const url = process.argv.at(-1);
const store = InFlightBuildStore();
setInterval(() => actionSoundJob(url, say, store), 5000);
```

### Anti-Patterns to Avoid

- **Re-exporting `timer`:** A timer export advertises an import-time side effect and perpetuates `clearInterval` test cleanup.
- **Moving selector or lifecycle edits into extraction commits:** D-03 requires byte-for-byte behavioral preservation of Phase 2 semantics, including DOM order, title refresh, unknown handling, and terminal deletion.
- **Adding a `shell: true` option to `execFile`:** Node warns that unsanitized input is unsafe when a shell is enabled. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md]
- **Putting argv reads in `index.js`:** It violates D-04/D-05 even if the interval itself moves elsewhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe process argument escaping | Custom quote/escape function around `exec` | `execFile('say', [sentence], callback)` | Shell quoting is error-prone; argv preserves the sentence as data. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |
| Module-entry detection | Parent-module heuristics | Separate `cli.js` entry; `require.main === module` only if a direct-entry guard is needed | Node defines `require.main` as the CommonJS entry module. [CITED: https://github.com/nodejs/node/blob/main/doc/api/modules.md] |
| Lifecycle rewrite | New reducer/queue/mutex | Existing `InFlightBuildStore.apply` behavior moved unchanged | Phase 2 acceptance already locks its edge cases. [VERIFIED: 02-CONTEXT.md] |

**Key insight:** The safe refactor is relocation plus explicit dependency injection, not replacement of working scrape, lifecycle, or speech behavior.

## Common Pitfalls

### Pitfall 1: Accidental import-time work
**What goes wrong:** `index.js` still declares a default URL, store, or `setInterval` at module scope; tests appear to pass but imports start background work.
**Why it happens:** Moving the interval alone while retaining top-level initialization confuses library and CLI responsibilities.
**How to avoid:** Make `index.js` export-only except an `actionSoundJob` that receives `url`, `announce`, and `store`; construct runtime state in `cli.js`.
**Warning signs:** A test needs `clearInterval`, a `got` mock is called immediately after `require`, or Jest reports open handles.

### Pitfall 2: Testing a mocked `execFile` too late
**What goes wrong:** A spy is attached after `announce.js` destructures `execFile`, so the assertion misses the actual bound function.
**Why it happens:** CommonJS dependencies are captured at require time.
**How to avoid:** Use `jest.mock('child_process', ...)` before requiring the module, or expose a narrowly scoped injected executor only if needed; assert `'say'` and `[sentence]` exactly.
**Warning signs:** The test records zero calls despite a visible log line.

### Pitfall 3: Altering Phase 2 rules during file movement
**What goes wrong:** Reordering `store.apply`, changing `null` handling, or modifying status predicates causes re-admission, terminal retirement, unknown-state, or DOM-order regressions.
**Why it happens:** The split exposes tempting “cleanup” opportunities.
**How to avoid:** Keep existing 60 assertions green before and after extraction; add no selector, mutex, queue, or URL-validation changes.
**Warning signs:** Transition sentence/order or retained Map-state assertions change.

### Pitfall 4: Losing the package CLI contract
**What goes wrong:** `main`, `bin`, and `scripts.sound` are not updated consistently, or `cli.js` lacks its executable shebang.
**Why it happens:** The previous file was both library and command.
**How to avoid:** Point `main` to `index.js`, `bin.github_action_sound` to `./cli.js`, and `sound` to `node ./cli.js`; smoke-test `node ./cli.js <url>` with dependencies mocked/manual controlled.
**Warning signs:** `github_action_sound` resolves the library barrel and exits or imports begin polling.

## Code Examples

### Safe fire-and-forget speech

```javascript
// Source: https://github.com/nodejs/node/blob/main/doc/api/child_process.md
const { execFile } = require('node:child_process');

function say(sentence, colorCode) {
  if (sentence === '') return;
  console.error(colorCode + now() + ': ' + sentence + Reset);
  execFile('say', [sentence], (error) => {
    if (error) console.error(error);
  });
}
```

### Import-safe CommonJS boundary

```javascript
// Source: https://github.com/nodejs/node/blob/main/doc/api/modules.md
// cli.js is the executable; index.js only exports library functions.
const { actionSoundJob, InFlightBuildStore, say } = require('./index');
const store = InFlightBuildStore();
const url = process.argv.at(-1);
setInterval(() => actionSoundJob(url, say, store), 5000);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `exec('say "' + sentence + '"')` | `execFile('say', [sentence])` | This phase | Scraped titles remain argv data rather than shell syntax. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |
| CLI/library in one import-side-effect module | Separate executable and import-safe library entry | This phase | Tests and consumers can require the library without starting polling. [CITED: https://github.com/nodejs/node/blob/main/doc/api/modules.md] |

**Deprecated/outdated:**
- `child_process.exec` with interpolated scraped text: unsafe for this use because it invokes a shell. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md]
- `japaneseDictionary`: unused and incompatible with normalized statuses; D-10 directs removal. [VERIFIED: index.js and 03-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The published bin accepts `cli.js` through the existing npm packaging configuration without an additional file allowlist. | Architecture Patterns | The installed package could omit the CLI; verify with `npm pack --dry-run` if a package `files` field is later added. |

## Open Questions (RESOLVED)

1. **Should `actionSoundJob` remain a thin export in `index.js`?**
   - **RESOLVED:** Yes — keep `actionSoundJob(url, announce, store)` as a pure injected-dependency helper exported from `index.js` (D-05 / Claude's Discretion). It must not create a timer or read argv. Plan 03-01 implements this.
   - Rationale: Minimizes test churn; existing suite already injects dependencies into `actionSoundJob`.

2. **Should README wording change?**
   - **RESOLVED:** No README change required.
   - Evidence (2026-07-24): `README.md` only documents `github_action_sound <github action url>` and does not name `index.js` as the executable path. Public command/arg shape unchanged (D-04/D-05).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | CJS modules and Jest | ✓, but below project engine | `v24.5.0` vs required `>=24.12` | Use the pinned Devbox/Nix runtime before final verification. |
| pnpm | Existing test command | ✓ | `10.31.0` | — |
| macOS `say` | Manual speech smoke test | ✓ | system command (no version flag) | None; it is a product platform requirement. |
| Nix | Project command prefix | ✓ | installed | `nix develop` cannot run here because the repository has no `flake.nix`; use the project’s existing toolchain/Devbox configuration. |

**Missing dependencies with no fallback:** None.  
**Missing dependencies with fallback:** Node `24.12+` is not active in this shell; automated tests passed under `24.5.0` with an engine warning, but final phase verification should use the declared floor.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest `30.2.0` |
| Config file | `jest.config.js` |
| Quick run command | `nix --version >/dev/null && pnpm test --runInBand` |
| Full suite command | `nix --version >/dev/null && pnpm test --runInBand` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAFE-01 | `say` calls `execFile('say', [sentence], callback)`, never `exec`; empty input short-circuits; errors log | unit | `nix --version >/dev/null && pnpm test --runInBand` | ❌ extend `__tests__/sound-monitor.spec.js` |
| SAFE-02 | Requiring `index.js` neither creates an interval nor invokes network/speech; no timer cleanup is needed | unit | `nix --version >/dev/null && pnpm test --runInBand` | ❌ extend `__tests__/sound-monitor.spec.js` |
| STRUCT-01 | Existing scrape → store → ordered announce, null no-op, terminal retirement, re-admit, title refresh, and status mapping still pass through extracted modules | unit/integration | `nix --version >/dev/null && pnpm test --runInBand` | ✅ existing suite, imports need retargeting |
| CLI contract | `package.json` maps `main` to `index.js`, bin and `sound` to `cli.js` | unit/static assertion | `nix --version >/dev/null && pnpm test --runInBand` | ❌ add focused manifest assertion or manual smoke |

### Sampling Rate

- **Per task commit:** `nix --version >/dev/null && pnpm test --runInBand`
- **Per wave merge:** `nix --version >/dev/null && pnpm test --runInBand`
- **Phase gate:** Full suite green on Node `>=24.12`, plus a manual `github_action_sound <actions-url>` smoke test.

### Wave 0 Gaps

- [ ] Extend `__tests__/sound-monitor.spec.js` with the argv-form `execFile` test.
- [ ] Extend `__tests__/sound-monitor.spec.js` with an import-side-effect test and remove the `clearInterval(timer)` teardown.
- [ ] Add a package-entry/CLI wiring assertion or record it as a manual smoke check.

**Baseline:** 60/60 existing tests pass. The local shell reports the expected Node-engine warning because it runs `v24.5.0`, below the project’s `>=24.12` engine. [VERIFIED: test run on 2026-07-24]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local CLI has no authentication flow. |
| V3 Session Management | no | Local CLI has no session state. |
| V4 Access Control | no | Local single-user process has no authorization boundary. |
| V5 Input Validation | yes | Treat scraped title text as untrusted process data; pass it as an `execFile` argv item, never a shell string. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |
| V6 Cryptography | no | No cryptographic operation is introduced. |

### Known Threat Patterns for Node child processes

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Shell metacharacters in scraped title cause command injection | Elevation of Privilege | Use `execFile('say', [sentence])` with no `shell` option. [CITED: https://github.com/nodejs/node/blob/main/doc/api/child_process.md] |
| Missing `say` executable or failed child process disrupts polling | Denial of Service | Keep callback error logging and do not await, throw, or stop the interval. [VERIFIED: 03-CONTEXT.md D-08/D-09] |
| Import starts unsolicited network polling | Denial of Service | Restrict argv, store creation, and interval scheduling to `cli.js`. [VERIFIED: 03-CONTEXT.md D-04/D-05] |

## Sources

### Primary (HIGH confidence)
- Repository source and locked phase context — current module seams, behavior constraints, dependency versions, test baseline.

### Secondary (MEDIUM confidence)
- [Node.js child_process documentation](https://github.com/nodejs/node/blob/main/doc/api/child_process.md) — `execFile` argv/shell behavior and callback errors.
- [Node.js modules documentation](https://github.com/nodejs/node/blob/main/doc/api/modules.md) — `require.main === module` entry-point semantics.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing locked stack and package metadata were directly inspected.
- Architecture: HIGH — module responsibilities and constraints are locked in 03-CONTEXT.md; Node entry semantics are documented.
- Pitfalls: MEDIUM — critical child-process and module-entry risks are documented; exact test implementation choices remain local design details.

**Research date:** 2026-07-24  
**Valid until:** 2026-08-23
