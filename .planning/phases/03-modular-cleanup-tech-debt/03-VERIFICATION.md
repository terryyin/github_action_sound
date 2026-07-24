---
phase: 03-modular-cleanup-tech-debt
verified: 2026-07-24T09:40:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm sound <busy-public-actions-url>` on macOS and wait for an in-flight run to transition."
    expected: "The CLI keeps polling and prints and speaks each title-bearing transition, including more than one concurrent suite when applicable."
    why_human: "Unit tests prove CLI routing, scheduling, scrape/store/announce composition, and argv-safe speech, but cannot prove a real public Actions page yields an observable transition or that the host say process is audible."
---

# Phase 03: Modular Cleanup + Tech Debt Verification Report

**Phase Goal:** As a developer watching GitHub Actions, I want speech hardened against shell injection, library requires that do not start the poller, and scrape/status/store/announce split into clear modules, so that multi-build monitoring stays safe and maintainable without changing announce behavior.
**Verified:** 2026-07-24T09:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Start monitor | `github_action_sound <actions-url>` resolves to the executable CLI | `package.json` maps `bin.github_action_sound` to `./cli.js`; `cli.js` has the Node shebang and creates the 5-second interval | ✓ VERIFIED |
| Monitor Actions | CLI composes the existing scrape → store → announce path | `cli.js` imports the public barrel; `index.js` calls `buildStates`, `store.apply`, then the injected announcer in descriptor order | ✓ VERIFIED |
| Receive safe announcements | Scraped title text is sent to macOS `say` as data, not shell syntax | `announce.js` calls `execFile('say', [sentence], callback)`; adversarial argv test passes | ✓ VERIFIED |
| Reuse library safely | Requiring the library does not start polling or a network loop | `index.js` has no argv, timer, or process lifecycle work; inert-import test passes | ✓ VERIFIED |
| Outcome | Multi-build monitoring remains safe and maintainable without changing announcement behavior | 68 passing tests cover the Phase 1/2 lifecycle and Phase 3 boundary regressions; live audible smoke remains required | ⚠️ HUMAN VERIFICATION |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Speech uses argv-form invocation so scraped title text never enters a shell string. | ✓ VERIFIED | `announce.js` invokes `execFile('say', [sentence], callback)` and the hostile-text assertion passed. |
| 2 | Requiring library modules starts no live poller or network loop. | ✓ VERIFIED | The side-effect-free barrel only imports library APIs; the isolated import test asserts no `setInterval`, `got`, or `execFile` calls. |
| 3 | Scrape, status normalization, in-flight store, and announce responsibilities are split from the monolith into clear modules. | ✓ VERIFIED | `scrape.js`, `status.js`, `store.js`, and `announce.js` are substantive root-level CJS modules with the intended one-way dependency graph. |
| 4 | `github_action_sound <actions-url>` still routes through `cli.js` and retains Phase 2 behavior. | ✓ VERIFIED | `bin` and `sound` both target `cli.js`; tests verify CLI store/interval ownership plus the complete ordered multi-build lifecycle matrix. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `announce.js` | Timestamped stderr and argv-form macOS speech | ✓ VERIFIED | Uses `execFile`, preserves empty-input guard and callback error logging; re-exported by `index.js`. |
| `cli.js` | Executable-only argv, store, and polling ownership | ✓ VERIFIED | Shebang, barrel import, argv read, one store, and 5-second `setInterval` are present. |
| `status.js` | Status vocabulary, normalization, descriptors, English dictionary | ✓ VERIFIED | Exports all required domain APIs; no Japanese dictionary export. |
| `scrape.js` | Public Actions HTML fetch and ordered normalized snapshots | ✓ VERIFIED | Fetches via `got`, validates DOM rows, normalizes at construction, returns ordered `BuildState` values. |
| `store.js` | Map-backed in-flight lifecycle | ✓ VERIFIED | Imports status APIs and applies admission, updates, terminal retirement, and ordered descriptors. |
| `index.js` | Inert composition barrel and `actionSoundJob` | ✓ VERIFIED | Re-exports the library APIs and wires `buildStates` → `store.apply` → injected announcement callback without runtime startup. |
| `package.json` | Library main and CLI routing | ✓ VERIFIED | `main` is `index.js`; `bin.github_action_sound` and `scripts.sound` target `cli.js`. |
| `__tests__/sound-monitor.spec.js` | SAFE/STRUCT and inherited lifecycle coverage | ✓ VERIFIED | 68 assertions passed, including direct-module identity, import safety, argv safety, CLI routing, and multi-build behavior. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `cli.js` | `index.js` | CommonJS import of orchestration, store, and speech API | ✓ WIRED | `require('./index')` destructures `actionSoundJob`, `InFlightBuildStore`, and `say`. |
| `index.js` | `announce.js` | Side-effect-free re-export | ✓ WIRED | Imports and re-exports `say`; no announcement runs at import time. |
| `package.json` | `cli.js` | Bin and local sound command | ✓ WIRED | Both manifest routes resolve to the executable file; regression test verifies target and shebang. |
| `scrape.js` | `status.js` | Normalized `BuildState` construction | ✓ WIRED | Imports `BuildState`/`normalizeStatus` and constructs each state from its live DOM aria label. |
| `store.js` | `status.js` | Lifecycle predicates and descriptors | ✓ WIRED | Imports `Status`, `BuildState`, and `englishDictionary`; all are used in `apply`. |
| `index.js` | `scrape.js` and `store.js` | Poll composition | ✓ WIRED | Awaits `buildStates(url)`, calls `store.apply(states)` once, and forwards every descriptor in order. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `scrape.js` | `states` | `got(url)` response parsed by JSDOM | Public page rows are mapped to normalized `BuildState` objects, not static data | ✓ FLOWING |
| `index.js` | `announcements` | `store.apply(states)` | Store descriptors are passed to the injected announcer in order | ✓ FLOWING |
| `announce.js` | `sentence` | Descriptor supplied by `actionSoundJob` | Sentence is stderr-rendered and sent as the sole `say` argv item | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| SAFE-01, SAFE-02, STRUCT-01, and Phase 2 regressions | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test --runInBand` | 1 suite, 68 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| SAFE-01 | 03-01, 03-02 | Scraped text never passes through a shell string | ✓ SATISFIED | Direct `execFile` argv implementation and hostile-title assertion passed. |
| SAFE-02 | 03-01, 03-02 | Library require starts no poller or network loop | ✓ SATISFIED | Lifecycle resides exclusively in `cli.js`; isolated import assertion passed. |
| STRUCT-01 | 03-01, 03-02 | Scrape, normalization, store, and announce split from the monolith | ✓ SATISFIED | Four root-level responsibility modules are substantive, wired, and exported through the inert barrel. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scrape.js` | 11, 29 | `return null` | ℹ️ Info | Deliberate failure/no-snapshot sentinel; `index.js` handles it without mutating the store. |
| `index.js` | 13 | `return []` | ℹ️ Info | Deliberate null-scrape no-op; exercised by regression coverage. |

No unresolved `TBD`, `FIXME`, or `XXX` markers were found in Phase 3 runtime modules.

### Human Verification Required

### 1. Live macOS CLI smoke

**Test:** Run `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm sound <busy-public-actions-url>` on macOS and wait for one or more queued/running suites to transition.

**Expected:** The public command keeps polling and prints and speaks each title-bearing transition. With multiple changing suites, each is announced separately.

**Why human:** The automated suite proves the process boundary, CLI routing, interval setup, and lifecycle behavior with fixtures. It cannot guarantee that a live public page has an observable transition during the test window or verify host audio output.

---

_Verified: 2026-07-24T09:40:00Z_
_Verifier: Claude (gsd-verifier)_
