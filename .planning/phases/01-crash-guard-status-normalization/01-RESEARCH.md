# Phase 1: Crash Guard + Status Normalization - Research

**Researched:** 2026-07-24
**Domain:** Node CJS CLI — GitHub Actions HTML scrape poller; scrape-failure guard + aria-label → status enum
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Scrape failure behavior
- **D-01:** On scrape/network/DOM failure, log the error and **skip the update path entirely** — do not throw, do not clear or mutate last-known state. — **Reversibility:** reversible
- **D-02:** Malformed individual rows (when multi-row scrape appears later) should be skippable per row; Phase 1 at minimum must not pass `undefined` into `MostRecentUpdate` / equivalent. — **Reversibility:** reversible

#### Status normalization
- **D-03:** Normalize at the scrape boundary: map raw `aria-label` → closed enum before `colorCode`, `diffToSentence`, or any lifecycle check. — **Reversibility:** costly — color/speech/diff all depend on the enum shape
- **D-04:** Enum must cover at least: queued, running, success, failure; include cancelled and skipped if fixture/live labels expose them; map unrecognized labels to `unknown`. — **Reversibility:** costly — expanding/renaming enum touches tests and announce paths
- **D-05:** `unknown` must not crash; skip speech/color announcement when there is no meaningful mapped transition (e.g. unknown→unknown). Prefer logging over inventing phrases. — **Reversibility:** reversible
- **D-06:** Drive ANSI colors and English speech phrases from the enum only — retire the mismatched `'queued: '` / dotted test literals. — **Reversibility:** costly — tests and dictionaries rewrite together

#### Testing / fixtures
- **D-07:** Unit tests assert against normalized enum + live-shaped fixture `aria-label` strings (expand the existing JSDOM fixture as needed). No CI dependency on live GitHub fetches. — **Reversibility:** reversible
- **D-08:** Keep Jest + `jest.mock('got')` pattern; clearInterval of the import-side-effect timer remains required until Phase 3. — **Reversibility:** reversible

### Claude's Discretion
- Exact enum member names and mapping table for known GitHub labels
- Whether `buildState` returns `null` vs a Result type for failure (planner/researcher choose)
- Minimal wording tweaks to English dictionary once enum is fixed

### Deferred Ideas (OUT OF SCOPE)
- Multi-suite `querySelectorAll` + InFlightBuildStore — Phase 2
- `execFile('say', …)`, `require.main` poller guard, module split — Phase 3
- Cancelled/skipped announce policy beyond “map if present in labels” — refine in Phase 2 if needed
- Recapture fresh live Actions HTML for aria-label matrix — do during Phase 1/2 planning research if fixtures incomplete
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-01 | On scrape/network/DOM failure, the poll tick logs the error and skips updates without throwing or clearing in-flight state | Crash-guard pattern: `buildState` → `null`; `actionSoundJob` early-return before `MostRecentUpdate` |
| REL-02 | Scraped SVG `aria-label` values are normalized to a single status enum used for color, speech, and lifecycle decisions | `normalizeStatus` at scrape boundary; prefix-before-colon matching for live labels |
| REL-03 | Colored stderr and spoken phrases use the normalized status enum (live GitHub labels produce correct colors and sentences) | `colorCode()` + `englishDictionary` keyed only by enum members |
| REL-04 | Unit tests assert against the normalized enum / live fixture labels (no synthetic dotted status strings that diverge from production) | Expand fixture `aria-label`s; rewrite tests off `'completed successfully.'` / `'queued: '` literals |
</phase_requirements>

## Summary

Phase 1 hardens the existing single-file poller so a bad scrape cannot throw inside the interval callback, and so live Actions SVG `aria-label` strings drive color and speech through one closed status enum. Work stays inside `index.js` + `__tests__/sound-monitor.spec.js` on the current CJS stack (`got@11.8.6`, `jsdom@26.1.0`, Jest 30) — no new dependencies, no multi-suite Map, no `execFile` / module split. [VERIFIED: package.json, SUMMARY.md, CONTEXT.md]

Live public Actions HTML (captured 2026-07-24 from `actions/runner`, `microsoft/vscode`, `vercel/next.js`) shows status icons use **`STATUS_PREFIX:  Run N of Workflow. title`**, not the bare fixture string alone. Observed prefixes: `completed successfully`, `failed`, `currently running`, `skipped`, `requires action with the application`. The 2023 fixture’s bare `completed successfully` remains a valid scrape input and must keep working. Normalization must match on the prefix (before the first `:`, or the whole string when no colon). [VERIFIED: live Actions HTML capture 2026-07-24]

**Primary recommendation:** Return `null` from `buildState` on any scrape failure; guard the poll `.then` before `MostRecentUpdate`; add `normalizeStatus(ariaLabel)` immediately after reading `svg` aria-label; rewrite `colorCode`, English phrases, and tests to consume enum values only — keep first-row `querySelector` until Phase 2.

## Architectural Responsibility Map

Single-tier local CLI — all Phase 1 capabilities live in the Node process.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Poll tick / scrape-failure guard | API / Backend (CLI process) | — | Interval + Promise handler owns no-op vs update |
| HTTP GET Actions HTML | API / Backend | CDN / Static (GitHub) | `got(url)` into process memory |
| DOM parse + first-row extract | API / Backend | — | JSDOM in-process; still `querySelector` first suite |
| Status normalization | API / Backend | — | Pure function at scrape boundary before domain updates |
| Diff / color / English phrase | API / Backend | — | `BuildState` + dictionary; no browser UI |
| Speech + colored stderr | API / Backend | OS (`say`) | Existing `say()`; Phase 3 hardens spawn |
| Unit tests / fixtures | API / Backend | — | Jest + mocked `got`; no live CI fetch |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=24.12` (engines) | CLI runtime | Existing pin; Phase 1 needs no new APIs [VERIFIED: package.json] |
| `got` | `11.8.6` | HTTP GET | Keep CJS client; no install this phase [VERIFIED: npm registry / package.json] |
| `jsdom` | `26.1.0` | Parse Actions HTML | Existing DOM scrape [VERIFIED: npm registry / package.json] |
| Jest + babel-jest | `^30.2.0` | Unit tests + `jest.mock('got')` | Existing pattern (D-08) [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `console.error` | built-in | Log scrape failures | REL-01 error path |
| Plain string enum / `Object.freeze` map | stdlib | Status vocabulary | No enum library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `null` scrape failure | `{ ok:false, error }` Result | More ceremony; no consumers yet — defer until module split |
| Substring/`includes` normalize | Exact full-string match | Breaks on live `prefix:  Run…` labels |
| New status package / zod | Hand-rolled map | Overkill for ~7 strings in one file |
| Cheerio / Octokit | Keep got+jsdom | Stack rewrite forbidden this milestone [CITED: .planning/research/SUMMARY.md] |

**Installation:** None — Phase 1 installs **no new packages**.

```bash
# verify only — do not add deps
pnpm test
```

**Version verification (2026-07-24):** `got@11.8.6`, `jsdom@26.1.0`, `jest@30.2.0` present on npm and pinned/requested in `package.json`. [VERIFIED: npm view]

## Package Legitimacy Audit

> Phase 1 does **not** introduce external packages. Existing runtime deps audited for completeness only.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| got | npm | long-lived (`11.8.6`) | ~37M/wk | github.com/sindresorhus/got | SUS (seam “too-new” on registry modified date — false positive for established v11 pin) | **Retain existing** — do not reinstall; no planner install task |
| jsdom | npm | established | ~84M/wk | github.com/jsdom/jsdom | OK | Retain |
| jest | npm | established | ~45M/wk | github.com/jestjs/jest | OK | Retain (dev) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `got` seam false-positive — **no checkpoint**; already in tree at exact `11.8.6` with project keep policy. [VERIFIED: gsd package-legitimacy + STACK.md keep policy]

*No `[ASSUMED]` new package names recommended.*

## Architecture Patterns

### System Architecture Diagram

```
Timer tick (setInterval 5s)
        │
        ▼
 actionSoundJob
        │
        ▼
 buildState(url) ──got──► GitHub Actions HTML
        │
        ├── catch / missing nodes ──► console.error ──► return null
        │
        ▼
 JSDOM querySelector("[id^='check_suite_']")   # first row only (Phase 1)
        │
        ▼
 read svg aria-label + Link--primary title
        │
        ▼
 normalizeStatus(rawAria) ──► Status enum
        │
        ▼
 BuildState { buildName, status: enum, gitLog }
        │
        ▼
 actionSoundJob: if newState == null → return (no MostRecentUpdate, no say)
        │
        ▼
 MostRecentUpdate(newState) → { statement, colorCode }
        │
        ▼
 say(statement, colorCode) → stderr ANSI + exec say   # Phase 3: execFile
```

### Recommended Project Structure

```
index.js                      # Phase 1: add normalizeStatus, null guard, enum-driven color/dict
__tests__/sound-monitor.spec.js  # expand fixtures; enum assertions; scrape-failure tests
# Phase 3 only:
#   scrape.js / status.js / announce.js / cli.js
```

Keep changes in the monolith per project “reliability then refactor.” [CITED: .planning/research/ARCHITECTURE.md]

### Pattern 1: Null-safe scrape result

**What:** `buildState` always resolves to `BuildState | null`. Callers treat `null` as “skip tick.”
**When to use:** Every poll path (REL-01 / D-01 / D-02).
**Example:**
```javascript
// Source: project CONCERNS + CONTEXT D-01 (recommended shape)
async function buildState(url) {
  try {
    const resp = await got(url);
    const dom = new JSDOM(resp.body);
    const row = dom.window.document.querySelector("[id^='check_suite_']");
    if (!row) return null;
    const svg = row.querySelector('svg');
    const title = row.querySelector('span.Link--primary');
    const aria = svg && svg.getAttribute('aria-label');
    if (!aria || !title) return null;
    return new BuildState(row.id, normalizeStatus(aria), title.textContent.trim());
  } catch (err) {
    console.error(err);
    return null;
  }
}

const actionSoundJob = () => {
  buildState(githubActionURL).then((newState) => {
    if (newState == null) return;
    const toSay = mostRecentUpdate(newState);
    say(toSay.statement, toSay.colorCode);
  });
};
```

### Pattern 2: Normalize-at-boundary (prefix map)

**What:** Map raw aria-label → closed enum once; never pass raw strings into color/diff/dict.
**When to use:** Immediately after reading aria-label (D-03).
**Example:**
```javascript
// Source: live Actions HTML 2026-07-24 + ARCHITECTURE Pattern 2 (adapted)
const Status = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  ACTION_REQUIRED: 'action_required', // live prefix observed; see Open Questions
  UNKNOWN: 'unknown',
});

function statusHead(ariaLabel) {
  const raw = String(ariaLabel || '').trim();
  const head = raw.includes(':') ? raw.slice(0, raw.indexOf(':')) : raw;
  return head.trim().toLowerCase();
}

function normalizeStatus(ariaLabel) {
  const s = statusHead(ariaLabel);
  if (s === 'queued' || s.startsWith('queued')) return Status.QUEUED;
  if (s === 'currently running') return Status.RUNNING;
  if (s === 'completed successfully') return Status.SUCCESS;
  if (s === 'failed') return Status.FAILURE;
  if (s.includes('cancelled') || s.includes('canceled')) return Status.CANCELLED;
  if (s === 'skipped') return Status.SKIPPED;
  if (s.includes('requires action')) return Status.ACTION_REQUIRED;
  console.error('Unrecognized Actions status aria-label:', ariaLabel);
  return Status.UNKNOWN;
}
```

### Pattern 3: Enum-only announce dictionaries

**What:** `colorCode()` and `englishDictionary.translate(status)` key exclusively on enum members; `diffToSentence` compares enums and suppresses queued noise via `Status.QUEUED`.
**When to use:** REL-03 / D-06.

### Anti-Patterns to Avoid

- **Passing `undefined` into `MostRecentUpdate`:** throws on `.buildName` — current bug. [VERIFIED: index.js:160-165, CONCERNS.md]
- **Exact-match on full live aria-label:** live strings append `:  Run N of …` — exact equality fails. [VERIFIED: live HTML]
- **Keeping `'queued: '` / dotted test statuses:** false-green tests; `colorCode` stays `undefined`. [VERIFIED: __tests__/sound-monitor.spec.js, index.js:100-106]
- **Implementing Map / querySelectorAll / execFile here:** Phase 2/3 deferred (CONTEXT).
- **Treating empty/missing suite DOM as “clear state”:** must no-op; do not reset `lastBuildState`. [CITED: PITFALLS.md Pitfall 3]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom net.socket fetch | Existing `got@11.8.6` | Already integrated + mocked |
| HTML parse | Regex on Actions markup | Existing `jsdom` | Selectors already established |
| Status validation library | zod/io-ts for 7 strings | Frozen map + `normalizeStatus` | Zero dep; enum is tiny |
| Result monad framework | neverthrow / custom Either | `null` return | Matches CJS style; enough for one caller |
| Speech queue / mutex | Phase 2+ concerns | Leave `say` as-is | Out of Phase 1 scope |

**Key insight:** The domain bugs are vocabulary mismatch and missing null guards — not missing libraries.

## Common Pitfalls

### Pitfall 1: Guard only in `catch`, not at call site
**What goes wrong:** `buildState` logs and returns `undefined`; `.then` still calls `mostRecentUpdate(undefined)` → TypeError every 5s.
**Why it happens:** Error handling incomplete at the Promise consumer. [VERIFIED: index.js]
**How to avoid:** Explicit `return null` + `if (newState == null) return` in `actionSoundJob`.
**Warning signs:** Unhandled rejection / `Cannot read properties of undefined` in logs after network blips.

### Pitfall 2: Matching colon-suffixed color keys to bare/live labels
**What goes wrong:** `colorCode()` keys `'completed successfully: '` never match scraped values → `undefined` colors.
**Why it happens:** Three vocabularies (scrape / color / tests). [VERIFIED: CONCERNS.md]
**How to avoid:** Enum-only maps; normalize before `BuildState` construction.
**Warning signs:** Tests expect `colorCode: undefined` as “success.”

### Pitfall 3: Ignoring live `prefix:  Run…` shape in fixtures
**What goes wrong:** Tests pass on bare `completed successfully` but production labels include run titles after `:`.
**Why it happens:** Fixture drift (2023 HTML). [VERIFIED: live HTML vs __tests__ fixture]
**How to avoid:** Normalize via status head before `:`; add at least one fixture row with live-shaped `aria-label="completed successfully:  Run 1 of CI. title"`.
**Warning signs:** Production announces with wrong/empty color after label format change.

### Pitfall 4: `querySelector('svg')` without null checks
**What goes wrong:** Missing svg/title throws into catch (OK if catch returns null) — but partial rows must not invent state.
**Why it happens:** Assumes GitHub markup always present. [CITED: jsdom getAttribute → null]
**How to avoid:** Null-check row, svg, aria-label, and title before constructing `BuildState`.
**Warning signs:** Intermittent null returns on challenge/login HTML.

### Pitfall 5: Inventing speech for `unknown`
**What goes wrong:** Dictionary falls through to `` ` ${phrase}` `` and speaks `" unknown"`.
**Why it happens:** Current dictionary default interpolates the key. [VERIFIED: index.js:110-118]
**How to avoid:** For `unknown` / meaningless transitions, return `''` from `diffToSentence` / skip `say` (D-05); log unrecognized labels in `normalizeStatus`.
**Warning signs:** Spoken word “unknown” or empty-color spam.

## Code Examples

### Recommended English phrases (discretion)

```javascript
// Keys are Status enum values only — Source: researcher recommendation from D-06
const englishPhrases = {
  new_build: 'A new build ',
  the_build: 'The build',
  queued: ' has been queued.',
  running: ' is currently running.',
  success: ' completed successfully.',
  failure: ' failed.',
  cancelled: ' was cancelled.',
  skipped: ' was skipped.',
  action_required: ' requires action.',
  // unknown: intentionally omitted — no speech
};
```

### Recommended colors (discretion)

```javascript
colorCode() {
  return {
    queued: BgBlue + FgYellow + Blink,
    running: BgBlue + FgYellow + Blink,
    success: BgGreen + FgBlack,
    failure: BgRed + FgYellow + Blink,
    cancelled: BgYellow + FgBlack,
    skipped: Dim,
    action_required: BgYellow + FgBlack + Blink,
    // unknown → undefined → caller should not announce
  }[this.status];
}
```

### Jest scrape-failure test (REL-01 / REL-04)

```javascript
// Source: https://jestjs.io/docs/30.0/mock-function-api (mockRejectedValue)
test('buildState returns null when got rejects', async () => {
  got.mockRejectedValue(new Error('network down'));
  await expect(buildState('https://github.com/org/repo/actions')).resolves.toBeNull();
});

test('buildState returns null when check_suite missing', async () => {
  got.mockResolvedValue({ body: '<html><body>no suites</body></html>' });
  await expect(buildState('https://github.com/org/repo/actions')).resolves.toBeNull();
});
```

### Enum + live-shaped fixture assertion (REL-02 / REL-04)

```javascript
test('normalizes live-shaped aria-label to success', async () => {
  const liveShaped = html.replace(
    'aria-label="completed successfully"',
    'aria-label="completed successfully:  Run 11 of Docker Image CI. trigger build"'
  );
  got.mockResolvedValue({ body: liveShaped });
  const state = await buildState('https://example/actions');
  expect(state.status).toBe('success');
  expect(state.colorCode()).toBeDefined();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw aria-label through color/diff | Normalize once at scrape | Phase 1 (this) | Colors/speech trustworthy |
| Implicit `undefined` on scrape error | Explicit `null` + call-site guard | Phase 1 | Poll survives blips |
| Bare fixture-only labels | Bare + `prefix:  Run…` fixtures | Phase 1 tests | Locks live contract |
| Single first-row scrape | Still first-row (Phase 1) | Phase 2 upgrades | Out of scope here |

**Deprecated/outdated:**
- `'queued: '`, `'currently running: '`, `'completed successfully: '`, `'failed: '` as `colorCode` keys — retire. [VERIFIED: index.js]
- Test statuses `'completed successfully.'`, `'is currently running.'` — retire. [VERIFIED: __tests__/sound-monitor.spec.js]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Include `action_required` as a first-class enum member (live prefix `requires action with the application`) rather than folding into `unknown` | Standard Stack / normalize | Extra announce path; if user prefers unknown-only, drop member and map to `unknown` |
| A2 | `cancelled` mapping via `includes('cancelled'\|'canceled')` without a live sample this session | Mapping table | May mis-classify odd labels; still safer than crashing |
| A3 | Queued live prefix is `queued` (inferred from API + old color keys; not observed in 2026-07-24 captures) | Mapping table | Queued transitions may land in `unknown` until fixture/live sample confirms |
| A4 | Prefer `null` over Result type for `buildState` | Architecture | Low — easy to revisit at Phase 3 extract |

**If planner rejects A1:** map `requires action…` → `unknown` and skip speech (still D-04 compliant).

## Open Questions

1. **`action_required` in the closed enum?**
   - What we know: Live pages frequently use `requires action with the application:  Run…` [VERIFIED: live HTML]
   - What's unclear: Whether Phase 1 should announce it or treat as unknown until Phase 2 lifecycle policy
   - Recommendation: Include `action_required` with color + phrase (A1); cheap and matches Checks API vocabulary [CITED: docs.github.com status checks]

2. **Exact queued aria-label text**
   - What we know: Not observed in sampled public pages today; historical code expected `queued: `
   - What's unclear: Whether live text is `queued`, `queued:  Run…`, or something else
   - Recommendation: Map head `queued`; add fixture `aria-label="queued:  Run 1 of CI. title"` for REL-04 without live fetch

3. **Which svg aria-label when multiple exist on a row?**
   - What we know: Live rows expose both long `completed successfully:  Run…` and short `completed successfully: ` [VERIFIED: live HTML]
   - What's unclear: Whether `querySelector('svg')` always hits the status icon first
   - Recommendation: Prefer `row.querySelector('svg[aria-label]')` and normalize via prefix; first match is enough for Phase 1

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime / Jest | ✓ | v24.5.0 (local); engines `>=24.12` | Use Devbox/CI Node 24.12+ for release parity — Phase 1 code does not need 24.12-only APIs |
| pnpm | Install / test | ✓ | 10.31.0 | — |
| `got` / `jsdom` | Scrape | ✓ (package.json) | 11.8.6 / 26.1.0 | — |
| Jest | REL-04 tests | ✓ | ^30.2.0 | — |
| macOS `say` | Manual smoke only | ✓ | present | Unit tests do not invoke `say` |
| Live GitHub fetch in CI | — | N/A | — | Forbidden (D-07); fixtures only |

**Missing dependencies with no fallback:** none for Phase 1 implementation.

**Missing dependencies with fallback:** local Node `24.5.0` below engines floor — document only; CI/devbox remain source of truth.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest ^30.2.0 (+ babel-jest) |
| Config file | `jest.config.js` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REL-01 | `got` reject → `null`; missing DOM → `null`; update path not called with null | unit | `pnpm test -t 'buildState returns null'` | ❌ Wave 0 |
| REL-01 | After failed scrape, `MostRecentUpdate` state unchanged (call update only when non-null) | unit | `pnpm test -t 'skips update'` | ❌ Wave 0 |
| REL-02 | Fixture / live-shaped aria-label → enum | unit | `pnpm test -t 'normalizes'` | ❌ Wave 0 (scrape test must change expectation from raw string → enum) |
| REL-03 | `colorCode()` defined for success/running/failure/queued enums; speech uses enum phrases | unit | `pnpm test -t 'color\\|phrase\\|new status'` | ❌ Wave 0 (rewrite existing tests) |
| REL-04 | No dotted/`queued: ` literals in assertions; fixtures carry real aria-labels | unit | `pnpm test` + grep gate optional | ⚠️ existing file uses dotted literals — must rewrite |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `__tests__/sound-monitor.spec.js` — add `got.mockRejectedValue` / empty DOM → `null` cases (REL-01)
- [ ] `__tests__/sound-monitor.spec.js` — rewrite `BuildState` constructions to enum values; expect defined `colorCode` for known statuses (REL-03/REL-04)
- [ ] `__tests__/sound-monitor.spec.js` — extend HTML fixture(s) with `currently running`, `failed`, `skipped`, `queued`, and one live-shaped `completed successfully:  Run…` label (REL-02/REL-04)
- [ ] Export or unit-test `normalizeStatus` (either via scrape outcomes or `module.exports.normalizeStatus`) so mapping is directly assertable
- [ ] Keep `afterAll(() => clearInterval(timer))` (D-08)

*(Framework install: none — Jest already present)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public HTML scrape; no auth this milestone |
| V3 Session Management | no | — |
| V4 Access Control | no | Local CLI; operator-supplied URL |
| V5 Input Validation | yes | Null-check DOM; normalize aria-label to closed enum; do not trust raw label in control flow |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scraped title → shell via `exec('say "…"')` | Elevation / Tampering | **Deferred Phase 3** (`execFile`); do not expand `say` surface in Phase 1 |
| Unexpected aria-label / DOM | Tampering | `normalizeStatus` → `unknown`; skip announce; log |
| Arbitrary argv URL fetch | Spoofing / SSRF-ish | Out of Phase 1; existing operator trust model |
| Error object / HTML dumped carelessly | Information disclosure | Keep `console.error(err)` as today; avoid speaking raw HTML |

## Project Constraints (from .cursor/rules/)

| Source | Directive |
|--------|-----------|
| `.cursor/rules/release.mdc` | Release via semver git tag; CI publishes with npm Trusted Publishing; maintain `CHANGELOG.md` Keep a Changelog format. **No Phase 1 action** unless shipping a release. |

No additional coding/security rules under `.cursor/rules/` constrain scrape/normalize implementation. No project-local `skills/` directory found.

## Sources

### Primary (HIGH confidence)
- `index.js`, `__tests__/sound-monitor.spec.js` — current crash + vocabulary bugs
- `.planning/codebase/CONCERNS.md` — documented failure modes
- `.planning/phases/01-crash-guard-status-normalization/01-CONTEXT.md` — locked decisions D-01…D-08
- Live HTML capture 2026-07-24: `https://github.com/actions/runner/actions`, `microsoft/vscode/actions`, `vercel/next.js/actions` — aria-label prefixes
- `package.json` / `npm view` — got 11.8.6, jsdom 26.1.0, jest 30.2.0

### Secondary (MEDIUM confidence)
- Context7 `/websites/jestjs_io_30_0` — `mockRejectedValue` for async failure tests
- Context7 `/jsdom/jsdom` — `JSDOM` + `querySelector` / `getAttribute`
- `.planning/research/ARCHITECTURE.md` — normalize-at-boundary pattern
- `.planning/research/PITFALLS.md` — undefined scrape, vocabulary mismatch, fixture drift
- [GitHub Docs: status checks](https://docs.github.com/en/pull-requests/reference/status-checks) — API status/conclusion vocabulary (guides enum naming; not identical to UI aria-labels)

### Tertiary (LOW confidence)
- Queued/cancelled exact live aria-label strings (not observed in sampled pages this session)
- Seam `classify-confidence` for webfetch reported LOW even when HTML was fetched locally — claims above rely on direct capture, not that seam tier

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keep existing deps; verified on registry/package.json
- Architecture: HIGH — brownfield patterns + locked CONTEXT; live label shape verified
- Pitfalls: HIGH — reproduced from code + CONCERNS; live prefix risk newly verified

**Research date:** 2026-07-24
**Valid until:** 2026-08-24 (re-check live aria-label prefixes if GitHub UI drifts; 7 days if scrape tests start failing)
