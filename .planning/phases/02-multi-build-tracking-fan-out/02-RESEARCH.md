# Phase 2: Multi-Build Tracking + Fan-out - Research

**Researched:** 2026-07-24  
**Domain:** Stateful Node.js HTML-scrape monitor with per-entity transition fan-out  
**Confidence:** HIGH for phase behavior and architecture; MEDIUM for library documentation

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Track by check-suite id; announce identity = commit/run title (`PROJECT.md` / MULTI-02/03)
- Overlapping `say` OK; no coalescing multi-change into one summary (MULTI-04)
- In-flight only; no forever `previousBuildNames` blacklist; re-admit after drop (MULTI-05/06)
- Failed/null scrape: skip store update; preserve Map (Phase 1 D-01; REL-01)
- Malformed rows: skip per row; do not abort the whole scrape batch (Phase 1 D-02)
- Status enum + normalize-at-scrape-boundary remain the vocabulary for lifecycle (Phase 1 D-03–D-06)
- If a tracked suite id is missing from a successful scrape that still returned other suites, keep it in the Map; do not treat absence as terminal or invent a finish announcement.
- Empty scrape / network/DOM failure returns `null` and skips the store update entirely.
- No N-miss timeout prune in this phase; keep until an observed terminal status.
- Admit only `queued` and `running`.
- Terminal statuses are `success`, `failure`, `cancelled`, and `skipped`: announce once if tracked, then delete.
- `action_required`: announce only when already tracked and changed; retain it; never first-admit it.
- `unknown`: never admit; retain an already-tracked suite but skip speech.
- Announce first admission of every newly observed in-flight suite.
- Fan out one announcement per change in scrape/DOM order, without summary coalescing.
- Refresh stored `gitLog`/title on every successful per-id scrape.
- Stay in monolithic `index.js`; module split, `execFile`, and `require.main` are Phase 3 work.
- Replace `MostRecentUpdate` and `previousBuildNames` with a Map-backed in-flight store.

### Claude's Discretion
- Exact `InFlightBuildStore` / transition-engine API shape inside `index.js` (factory vs class) — stay in monolith until Phase 3
- Whether scrape helper is renamed `buildStates` → `BuildState[]` vs evolving `buildState` to return an array
- Whether to add a single-flight poll mutex this phase (research flags race risk; not required for MULTI acceptance if intervals stay short — planner may add a minimal guard if cheap)
- Fixture HTML layout for multi-suite cases (two concurrent in-flight + terminal flip)

### Deferred Ideas (OUT OF SCOPE)
- `execFile('say', …)`, `require.main` poller guard, scrape/status/store/announce module split — Phase 3
- N-miss soft-delete / bounded prune for long-running monitors — optional later; not MULTI acceptance
- Sequential speech queue or per-build voices — v2 QUEUE-01
- Poll single-flight mutex / chained `setTimeout` — cleanup/hardening if not cheaply included in Phase 2
- GitHub API / filters / TUI — out of scope this milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MULTI-01 | Scrape all check-suite rows every poll. | Evolve `buildState` to an array-returning scrape helper using `querySelectorAll("[id^='check_suite_']")`, preserving NodeList DOM order. |
| MULTI-02 | Track every queued/running suite by check-suite id. | Use `Map<checkSuiteId, BuildState>` and admit only normalized `queued`/`running`. |
| MULTI-03 | Announce each tracked status transition by title. | Compare each snapshot only to the Map entry with the same id; retain refreshed `gitLog` for sentence generation. |
| MULTI-04 | Announce every changing in-flight suite in one poll. | Return ordered announcement descriptors from one snapshot application, then call `say` once per descriptor. |
| MULTI-05 | Announce terminal tracked suites then remove them. | Terminal predicate drives transition announcement followed by immediate `Map.delete(id)`. |
| MULTI-06 | Re-track a completed suite id when it returns in flight. | Do not retain `previousBuildNames` or any terminal blacklist; a later queued/running sighting is a new admission. |
</phase_requirements>

## Summary

Phase 2 is a focused monolith change: change the scraper from one DOM row to an ordered `BuildState[]`, then replace the singleton `MostRecentUpdate` closure with an in-flight `Map` keyed by `check_suite_*` id. The store is the lifecycle authority. It admits only queued/running suites, compares a tracked id only with its own previous snapshot, returns one ordered announcement descriptor per meaningful transition, and deletes an entry only after observing and announcing a terminal status.

The failure boundary remains before the store: `null` means the full scrape was unusable and must leave the Map untouched. A non-null array can contain zero or more valid rows; malformed individual rows are skipped. A missing tracked id in an otherwise successful array is not an event in this phase. This distinction prevents a partial page, filtering, or temporary DOM loss from creating a fabricated completion.

No dependency, framework, module split, or speech queue is needed. Preserve the current Jest + mocked `got` test setup and single-file `index.js` boundary. The highest-value plan is tracer-first: prove scrape-all → Map transition application → ordered fan-out with two suites, then lock the complete lifecycle matrix in tests.

**Primary recommendation:** Implement a small `InFlightBuildStore` factory in `index.js` whose `apply(BuildState[])` method returns ordered `{ statement, colorCode }` descriptors; keep `actionSoundJob` as the thin scrape-null guard and `say` fan-out loop.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch public Actions HTML | CLI / integration client | — | The local Node process owns the outbound `got` request. |
| Extract every suite row in DOM order | CLI / integration client | — | JSDOM parses the page and yields the local snapshot array. |
| Normalize status and classify lifecycle | CLI / domain logic | — | `Status` is already the internal vocabulary and must remain independent of GitHub wording. |
| Track in-flight suites and transitions | CLI / domain logic | — | A process-local `Map` is sufficient for one URL and one process. |
| Fan out stderr and speech | CLI / output | macOS `say` | The process emits every descriptor immediately; overlapping child speech is a locked product behavior. |

## Project Constraints (from .cursor/rules/)

- Release tags, not `package.json`, are the version source of truth.
- Release work must update `CHANGELOG.md` and use semantic version tags.
- npm publishing uses GitHub Actions Trusted Publishing/OIDC; do not add long-lived `NPM_TOKEN` handling.
- These release constraints do not require code changes in Phase 2, but the planner must not introduce version or publishing changes.

## Standard Stack

### Core

| Library / runtime | Verified version | Purpose | Why standard here |
|-------------------|------------------|---------|-------------------|
| Node.js | `v24.18.0` available; project floor `>=24.12` | CJS CLI and built-in `Map` | The existing runtime; native Map covers the whole in-flight store. [VERIFIED: local environment and package.json] |
| `got` | `11.8.6` pinned | Fetch Actions HTML | Existing CJS-compatible HTTP client; no transport change is needed. [VERIFIED: package.json] |
| `jsdom` | `26.1.0` pinned | Parse HTML and select suite rows | Existing scraper dependency. Its selector API returns a static NodeList in document order. [CITED: https://github.com/jsdom/jsdom] |
| Jest | `30.2.0` declared | Mocked HTTP and lifecycle assertions | Existing test runner; supports awaited async tests and module mocks. [CITED: https://jestjs.io/docs/30.0/tutorial-async] |

### Supporting

| Capability | Use | When to use |
|------------|-----|-------------|
| In-flight storage | Native `Map` | All per-id lifecycle state; key by `BuildState.buildName` / `check_suite_*` id. |
| Snapshot array | `BuildState[]` | Successful scrape result; its order is the fan-out order. |
| Announcement descriptor | Plain `{ statement, colorCode }` object | Boundary between pure transition logic and side-effecting `say`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Process-local Map | Redis/database/queue | Adds persistence and operational complexity without helping one local CLI. |
| Immediate per-change `say` | Serialized speech queue | Contradicts locked overlapping-speech behavior; defer to v2. |
| Keep logic in `index.js` | Extract scrape/store/announce modules | Correct eventual structure, but explicitly deferred to Phase 3 until lifecycle behavior is proven. |

**Installation:** None. Phase 2 adds no external package.

## Architecture Patterns

### System Architecture Diagram

```text
timer tick
   |
   v
buildStates(url) ── failure / empty page ──> null ──> skip Map mutation
   |
   v
ordered BuildState[] (each row: id, normalized status, refreshed title)
   |
   v
InFlightBuildStore.apply(snapshot)
   ├─ untracked + queued/running ─────> insert, emit "new build"
   ├─ tracked + same status ──────────> refresh title, emit nothing
   ├─ tracked + changed known status ─> refresh, emit transition
   ├─ tracked + terminal ─────────────> emit transition, delete
   ├─ tracked + action_required ──────> emit if changed, retain
   └─ tracked + unknown ──────────────> retain, emit nothing
   |
   v
ordered announcement descriptors ──> say() once per descriptor ──> stderr + macOS speech
```

### Recommended In-File Shape

```text
index.js
├── Status, normalizeStatus, BuildState, dictionaries, say      # retain
├── buildStates(url)                                             # replaces one-row scrape
├── isInFlight(status), isTerminal(status)                       # lifecycle predicates
├── InFlightBuildStore()                                         # Map factory, pure transition core
├── const inFlightBuildStore = InFlightBuildStore()              # poller-owned state
└── actionSoundJob()                                             # null guard + descriptor fan-out

__tests__/sound-monitor.spec.js
├── compact row HTML factory / multi-row page factory
├── buildStates scrape coverage
└── store lifecycle and ordered fan-out coverage
```

### Pattern 1: Scrape All, Track Few

**What:** `buildStates` queries every `[id^='check_suite_']` row, transforms each well-formed row to a normalized `BuildState`, and returns the list in selector order. `querySelectorAll` is a static NodeList whose order follows the document order, so a normal `for...of` or `Array.from` preserves the required fan-out order. [CITED: https://github.com/jsdom/jsdom]

**When to use:** Every successful polling tick.

**Implementation rule:** If the request fails or the page has no suite rows, return `null`; if one row lacks its SVG, aria label, title, or id, log/skip that row and continue. Do not return an empty successful array for a missing-suite page because the locked policy requires it to be a no-op.

### Pattern 2: Map-Owned State Machine

**What:** The store owns admission, per-id comparison, title refresh, terminal retirement, and creation of announcement descriptors. The poller does not inspect statuses other than deciding whether a scrape was usable.

**Recommended API:**

```javascript
const store = InFlightBuildStore();
const announcements = store.apply(states); // BuildState[] -> ordered descriptors[]
```

Expose minimal test inspection (`has(id)`, `get(id)`, or `size`) instead of exporting the mutable Map directly. A factory matches the existing `MostRecentUpdate()` test pattern and gives every test a fresh store.

**Transition rules, in scrape order:**

| Existing entry | Incoming normalized status | Store action | Speech |
|----------------|----------------------------|--------------|--------|
| absent | `queued` / `running` | set incoming snapshot | “new build” announcement |
| absent | terminal / `action_required` / `unknown` | ignore | none |
| tracked | unchanged | replace stored snapshot to refresh title | none |
| tracked | changed `queued`, `running`, or `action_required` | replace stored snapshot | one status-change announcement |
| tracked | terminal | create transition descriptor, then delete | one terminal announcement |
| tracked | `unknown` | replace/retain snapshot | none |
| missing from successful snapshot | any | no action | none |

The terminal branch must execute after deriving its descriptor and before returning from that row, so a later reappearance as queued/running is admitted without a forever blacklist.

### Pattern 3: Compute Then Fan Out

**What:** `apply` returns all descriptors before `actionSoundJob` calls `say`. The returned array is a deterministic seam for tests and preserves DOM order even though the spawned speech processes may overlap.

**When to use:** Any successful non-null snapshot.

**Example:**

```javascript
const states = await buildStates(githubActionURL);
if (states == null) return;

for (const announcement of inFlightBuildStore.apply(states)) {
  say(announcement.statement, announcement.colorCode);
}
```

### Anti-Patterns to Avoid

- **Map keyed by title:** Titles are display text and can collide; use the check-suite DOM id as the key and title only in speech.
- **Deleting ids absent from the latest array:** Absence is not a terminal observation under D-01/D-03.
- **Treating `[]` as a successful scrape:** A missing/challenge/empty page must produce `null` and preserve state.
- **Retaining `previousBuildNames`:** Any permanent history breaks MULTI-06 and grows unbounded.
- **Batching the announcements into one sentence:** Violates MULTI-04 and makes overlapping speech unidentifiable.
- **Refactoring into modules or changing `say`:** Both are deferred to Phase 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent in-flight storage | Database, cache, or queue | Native `Map` | State is local, transient, and bounded by active rows. |
| DOM parsing / selector engine | Regex HTML parser | Existing `jsdom` selectors | The project already depends on real DOM parsing and fixtures exercise selectors. |
| Speech scheduler | Queue, workers, or broker | Existing immediate `say` calls | Overlapping speech is explicitly acceptable this phase. |
| Status representation | New raw-string variants | Existing `Status` and `normalizeStatus` | Lifecycle, color, and dictionary must share one closed vocabulary. |

**Key insight:** The only new abstraction needed is a pure per-id lifecycle store; all other capabilities already exist and should remain in place until Phase 3.

## Common Pitfalls

### Pitfall 1: Update a Build Against the Wrong Previous Build

**What goes wrong:** A global previous snapshot compares suite B to suite A when DOM rows interleave, causing a false “new build” or suppressing B’s actual terminal event.  
**Avoidance:** Read and write only `map.get(next.buildName)` for a transition; never use DOM position as identity.  
**Verification:** Two same-title but different-id running rows must independently produce transitions.

### Pitfall 2: Accidentally Clear State on an Empty or Partial Page

**What goes wrong:** A network failure, login/challenge page, missing selector, or momentary page filter makes active suites appear absent.  
**Avoidance:** `null` is the only failure sentinel and skips `apply`; do not delete ids absent from a successful list.  
**Verification:** Seed a store, apply `null` only through the poller guard, then assert the original id stays present.

### Pitfall 3: Lose the Required Fan-out Order

**What goes wrong:** Building a temporary object keyed by id or sorting by status changes the announcement order.  
**Avoidance:** Iterate the `BuildState[]` directly and append descriptors directly; `Map` lookup is for history, not ordering.  
**Verification:** Reverse two fixture rows and assert the descriptor/speech order reverses identically.

### Pitfall 4: Forget to Refresh Titles on No-Status-Change Polls

**What goes wrong:** A later terminal announcement names an old title because the store only writes when status changes.  
**Avoidance:** Replace the stored snapshot for every tracked row in a successful scrape, including equal status and `unknown`.  
**Verification:** running(title A) → running(title B) → success(title B) speaks title B.

### Pitfall 5: Treat `action_required` and `unknown` Like Terminals

**What goes wrong:** Retiring either status loses later completion information; admitting them first creates noise from historical rows.  
**Avoidance:** Follow the locked classification table exactly: `action_required` is tracked-only and retained; `unknown` is retained-but-silent and never admitted.  
**Verification:** Assert both store-membership and announcements for first-seen and tracked transitions.

### Pitfall 6: Overlapping Poll State Races

**What goes wrong:** `setInterval` may start a second async scrape before the prior one completes, allowing a stale snapshot to overwrite newer Map state or duplicate admission.  
**Avoidance:** This is deferred unless cheap, but the planner may add a minimal `pollInFlight` guard that skips a tick while one job runs. Do not serialize `say`; only state mutation needs single-flight protection.  
**Verification:** If included, use a deferred `got` mock and assert the second invocation does not apply state while the first is unresolved.

## Code Examples

### Scrape Ordered, Valid Rows

```javascript
const rows = dom.window.document.querySelectorAll("[id^='check_suite_']");
if (rows.length === 0) return null;

const states = [];
for (const row of rows) {
  const svg = row.querySelector('svg[aria-label]');
  const title = row.querySelector('span.Link--primary');
  const aria = svg && svg.getAttribute('aria-label');
  if (!row.id || !aria || !title) {
    console.error('Skipping malformed check suite:', row.id);
    continue;
  }
  states.push(new BuildState(row.id, normalizeStatus(aria), title.textContent.trim()));
}
return states;
```

Source: selector behavior is documented by jsdom’s Selectors API tests. [CITED: https://github.com/jsdom/jsdom]

### Deterministic Lifecycle Test

```javascript
const store = InFlightBuildStore();
const first = store.apply([
  new BuildState('check_suite_a', Status.RUNNING, 'alpha'),
  new BuildState('check_suite_b', Status.RUNNING, 'beta'),
]);
expect(first.map(({ statement }) => statement)).toEqual([
  "A new build 'alpha' is currently running.",
  "A new build 'beta' is currently running.",
]);

const terminal = store.apply([
  new BuildState('check_suite_a', Status.SUCCESS, 'alpha'),
  new BuildState('check_suite_b', Status.FAILURE, 'beta'),
]);
expect(terminal.map(({ statement }) => statement)).toEqual([
  'The build completed successfully.',
  'The build failed.',
]);
expect(store.has('check_suite_a')).toBe(false);
expect(store.has('check_suite_b')).toBe(false);
```

Jest supports awaited async tests and mocked modules; each store test should create a fresh factory instance and assert full ordered arrays. [CITED: https://jestjs.io/docs/30.0/tutorial-async]

## State of the Art

| Old approach | Current phase approach | Impact |
|--------------|------------------------|--------|
| `querySelector` first suite | `querySelectorAll` all suites | No in-flight suite is silently dropped due to position. |
| One `lastBuildState` plus `previousBuildNames` | `Map<checkSuiteId, BuildState>` | Correct per-suite diffing, bounded in-flight memory, and re-admission. |
| One announcement result per tick | Ordered descriptor array | Every status change in a poll is announced. |

**Deprecated/outdated for this phase:**
- `MostRecentUpdate` and `previousBuildNames` must be removed or made unused once the Map store is active; retaining their semantics violates MULTI-05/06.
- `buildState` as a one-row result must not remain the polling path. A compatibility alias is acceptable only if it returns the all-row array and is named clearly enough to avoid one-row callers.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A minimal `pollInFlight` guard can be added without crossing Phase 3’s poller-extraction boundary. | Common Pitfalls | Low; omit it if it complicates the tracer. |
| A2 | GitHub’s current page continues exposing check suites through the existing id/SVG/title selector trio. | Architecture Patterns | Medium; fixtures catch local regressions but not a live GitHub redesign. |

## Open Questions

1. **Should the optional single-flight guard ship in the tracer?**
   - What we know: overlapping async interval ticks can race on shared Map state; it is not a MULTI acceptance requirement.
   - Recommendation: add only a small boolean skip guard if it is isolated and testable; otherwise record it for Phase 3 exactly as deferred.

2. **How should a successful page with only malformed suite rows be classified?**
   - What we know: malformed individual rows must be skipped, while empty/failed scrapes preserve state.
   - Recommendation: return the valid-row list when at least one row is valid; treat an all-malformed result as `null`/no-op so it cannot imply all tracked suites vanished.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | CLI and Jest | ✓ | `v24.18.0` | — |
| pnpm | install/test command | ✓ | `10.31.0` | — |
| Existing `node_modules` | local test run | ✓ | installed | `pnpm install --frozen-lockfile` |
| macOS `say` | manual speech smoke | ✗ in the isolated Nix shell | — | Run manual smoke from the macOS host shell; automated tests must not invoke it. |
| GitHub Actions public HTML | manual end-to-end scrape | not probed | — | mocked HTML fixtures for automated validation |

**Missing dependencies with no fallback:** None for implementation and automated testing.  
**Missing dependencies with fallback:** `say` is unavailable in the isolated Nix shell, but it is intentionally not invoked by the Jest suite and can be smoke-tested from macOS.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest `30.2.0` with `jest.mock('got')` |
| Config file | `jest.config.js` |
| Quick run command | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm exec jest --runInBand` |
| Full suite command | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test` |

Baseline: the serial Jest command passed 49/49 tests on 2026-07-24. The expected mocked network-error tests log to stderr.

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|--------------|
| MULTI-01 | Two valid rows scrape into ordered `BuildState[]`; malformed sibling is skipped. | integration | serial Jest command above | Extend `__tests__/sound-monitor.spec.js` |
| MULTI-02 | First queued/running sightings are stored by distinct suite ids. | unit | serial Jest command above | Extend existing file |
| MULTI-03 | A tracked per-id status change emits title-aware transition data. | unit | serial Jest command above | Extend existing file |
| MULTI-04 | Two changed rows return two descriptors in fixture DOM order. | unit/integration | serial Jest command above | Extend existing file |
| MULTI-05 | A tracked terminal status announces then deletes; historical terminal remains silent. | unit | serial Jest command above | Extend existing file |
| MULTI-06 | A deleted id returns as queued/running and is admitted/announced anew. | unit | serial Jest command above | Extend existing file |

### Sampling Rate

- **Per task commit:** serial Jest command above.
- **Per wave merge:** `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test`.
- **Phase gate:** full Jest suite green plus manual macOS smoke with at least two overlapping public runs.

### Wave 0 Gaps

- [ ] Extend `__tests__/sound-monitor.spec.js` with a compact suite-row/page factory so two-row fixtures do not duplicate the current large fixture.
- [ ] Add store lifecycle assertions for admission, terminal drop, re-admission, absent-id retention, `action_required`, and `unknown`.
- [ ] Add an `actionSoundJob`-level or equivalent integration test that verifies ordered `say` fan-out without invoking macOS speech (mock the announce boundary or test returned descriptors).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---------------|---------|------------------|
| V2 Authentication | No | Public unauthenticated Actions scrape is a locked scope choice. |
| V3 Session Management | No | The CLI has no user session. |
| V4 Access Control | No | The process only accesses the user-supplied public URL. |
| V5 Input Validation | Yes | Treat GitHub title/aria-label text as untrusted; use it only as text and never as Map identity. |
| V6 Cryptography | No | No cryptographic operation is introduced. |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| Title collision joins two workflows | Tampering / integrity | Key the Map by `check_suite_*` id, never title. |
| Partial/empty DOM erases observed state | Integrity / availability | `null` scrape no-op; no absence-based deletion. |
| Scraped title reaches `exec('say "...")` | Elevation of privilege | Existing exposure is explicitly deferred to SAFE-01 / Phase 3; do not expand the shell-string path in Phase 2. |

The inherited shell-injection risk cannot be considered fixed in this phase because `execFile` is a locked Phase 3 item. The Phase 2 plan must preserve the existing `say` call signature and avoid new shell interpolation.

## Sources

### Primary (HIGH confidence)

- `02-CONTEXT.md` — locked lifecycle, absence, admission, title, and scope decisions.
- `REQUIREMENTS.md` — MULTI-01 through MULTI-06 and acceptance criteria.
- `index.js` and `__tests__/sound-monitor.spec.js` — current one-row scrape, singleton tracker, enum behavior, timer, and test seams.
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, and `SUMMARY.md` — project-specific architecture and known failure modes.
- Baseline validation: `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm exec jest --runInBand` — 49/49 passed.

### Secondary (MEDIUM confidence)

- [CITED: https://github.com/jsdom/jsdom] — Selectors API behavior, including static NodeList and DOM-order selector results.
- [CITED: https://jestjs.io/docs/30.0/tutorial-async] — awaited async tests, mocks, and rejected-promise assertions.

### Tertiary (LOW confidence)

- None beyond assumptions A1–A2, which are explicitly marked for planner awareness.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions, runtime, and no-new-dependency decision are locally verified.
- Architecture: HIGH — entirely constrained by locked decisions and current implementation.
- Pitfalls: HIGH — existing first-row, forever-blacklist, null-scrape, and async interval seams are directly observable; JSDOM/Jest documentation is MEDIUM.

**Research date:** 2026-07-24  
**Valid until:** 2026-08-23 for the local implementation; re-check live GitHub HTML selectors before a production smoke test.
