# Phase 2: Multi-Build Tracking + Fan-out - Pattern Map

**Mapped:** 2026-07-24  
**Requirements:** MULTI-01, MULTI-02, MULTI-03, MULTI-04, MULTI-05, MULTI-06  
**Files analyzed:** 2 modified files  
**Analogs found:** 5 / 6 planned responsibilities

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `index.js` — `buildStates` (evolved from `buildState`) | scrape helper / integration | request-response, transform | `index.js` `buildState()` | exact role; evolve one-to-many |
| `index.js` — `InFlightBuildStore` | state factory / domain | event-driven, transform | `index.js` `MostRecentUpdate()` | role-match only |
| `index.js` — `BuildState` announcement use | model / domain | transform | `index.js` `BuildState` | exact |
| `index.js` — `actionSoundJob` fan-out | poller / output coordinator | event-driven | `index.js` `actionSoundJob()` | exact role; evolve one-to-many |
| `__tests__/sound-monitor.spec.js` — multi-row fixture factories | test fixture | transform | inline `html` plus `htmlWithAriaLabel()` | exact |
| `__tests__/sound-monitor.spec.js` — lifecycle, mocked scrape, teardown tests | test | request-response, event-driven | current Jest tests | exact |

## Pattern Assignments

### `index.js` — all-suite scrape helper (integration, request-response/transform)

**Analog:** `index.js` `buildState()` (lines 93-108)

Preserve the asynchronous `got` → `JSDOM` boundary, normalize the aria label at the scrape boundary, and return `null` from the outer failure/empty-page paths. Replace only the single `querySelector` / one-row return with ordered `querySelectorAll` iteration. The helper must skip a malformed sibling row rather than turning the whole successful batch into a failure.

**Imports and parse/error-boundary pattern** (lines 4-6, 93-107):

```javascript
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function buildState(url) {
  try {
    const resp = await got(url);
    const dom = new JSDOM(resp.body);
    const row = dom.window.document.querySelector("[id^='check_suite_']");
    if (!row) return null;
    const svg = row.querySelector('svg[aria-label]');
    const title = row.querySelector('span.Link--primary');
    const aria = svg && svg.getAttribute('aria-label');
    if (!svg || !aria || !title) return null;
    return new BuildState(row.id, normalizeStatus(aria), title.textContent.trim());
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

**Required Phase 2 adaptation:** `querySelectorAll("[id^='check_suite_']")` returns the DOM-ordered source for both snapshots and later announcement order. Return `null` for no rows, request/JSDOM failure, or an all-malformed result so the store is never updated from an unusable page. For an otherwise valid page, collect valid `BuildState` rows and continue after a malformed row.

### `index.js` — `BuildState` and status vocabulary (model, transform)

**Analog:** `index.js` `Status`, `normalizeStatus`, and `BuildState` (lines 63-145)

Reuse the existing closed status enum, status normalization, sentence generation, and color lookup. State admission and retirement must compare enum members, never raw aria-label text. Do not introduce a second status vocabulary in the Map store.

**Status normalization pattern** (lines 63-90):

```javascript
const Status = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  ACTION_REQUIRED: 'action_required',
  UNKNOWN: 'unknown',
});

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

**Per-build diff and presentation pattern** (lines 110-145):

```javascript
class BuildState {
  constructor(buildName, status, gitLog) {
    this.buildName = buildName;
    this.status = status;
    this.gitLog = gitLog;
  }

  diffToSentence(previousState, dictionary) {
    const statusPhrase = dictionary.translate(this.status);
    if (this.status === Status.UNKNOWN || statusPhrase === '') {
      return '';
    }
    if (this.buildName != previousState.buildName) {
      return (
        dictionary.translate('new_build') +
        `'${this.gitLog}'` +
        statusPhrase
      );
    }
    if (this.status !== Status.QUEUED && this.status != previousState.status) {
      return dictionary.translate('the_build') + statusPhrase;
    }
    return '';
  }
}
```

**Required Phase 2 adaptation:** supply the previous state only from `Map.get(next.buildName)`. This preserves title identity for first admission and status-only language for known-id transitions. Refresh the stored `BuildState` on each observed tracked row, including same-status rows, so a later announcement uses the latest `gitLog`.

### `index.js` — `InFlightBuildStore` factory (domain, event-driven/transform)

**Analog:** `index.js` `MostRecentUpdate()` (lines 184-204)

This is the closest local factory pattern: mutable state is private to a PascalCase factory, and each invocation creates an isolated state machine suitable for direct Jest construction. The existing implementation's singleton/blacklist behavior is explicitly not reusable: `previousBuildNames` conflicts with terminal removal and re-admission in MULTI-05/06.

**Factory and descriptor pattern** (lines 184-204):

```javascript
const MostRecentUpdate = () => {
  var lastBuildState = new BuildState('', '');
  var previousBuildNames = [];

  return (newState) => {
    if(previousBuildNames.includes(newState.buildName)) {
      return { statement: '', colorCode: undefined };
    }
    const result = {
      statement: newState.diffToSentence(lastBuildState, englishDictionary),
      colorCode: newState.colorCode(),
    };
    if(lastBuildState.buildName != newState.buildName) {
      previousBuildNames.push(lastBuildState.buildName);
    }
    lastBuildState = newState;
    return result;
  };
};

const mostRecentUpdate = MostRecentUpdate();
```

**Required Phase 2 adaptation:** follow the private-factory and `{ statement, colorCode }` descriptor seam, but replace `lastBuildState` and `previousBuildNames` with `const statesById = new Map()`. An `apply(states)` method should iterate the input array directly and return a descriptor array in that same order. Admit only queued/running entries; announce and delete tracked terminal entries; retain tracked `action_required` and `unknown` entries under the locked rules. Never delete an id merely because it is absent from an otherwise successful snapshot.

### `index.js` — poller guard and speech fan-out (poller/output, event-driven)

**Analog:** `index.js` `actionSoundJob()` and `say()` (lines 51-61, 206-216)

Keep `actionSoundJob` as the side-effect boundary. It owns the null-scrape early return, while the store owns lifecycle classification. Preserve immediate, independent `say` calls; no speech queue or aggregation is permitted in this phase.

**No-op guard and side-effect pattern** (lines 51-61, 206-216):

```javascript
function say(sentence, colorCode) {
  if (sentence === '') {
    return;
  }
  console.error(colorCode + now() + ': ' + sentence + Reset);
  exec('say "' + sentence + '"', (err, _stdout, _stderr) => {
    if (err) {
      console.error(err);
    }
  });
}

const actionSoundJob = () => {
  buildState(githubActionURL).then(
    (newState) => {
      if (newState == null) return;
      const toSay = mostRecentUpdate(newState);
      say(toSay.statement, toSay.colorCode);
    }
  );
};

const timer = setInterval(actionSoundJob , 5000);
```

**Required Phase 2 adaptation:** after a non-null `BuildState[]` scrape, loop over `inFlightBuildStore.apply(states)` and call `say` once per returned descriptor. That loop is the fan-out point and must not sort, coalesce, or use `Promise.all`; simple synchronous iteration preserves DOM order before the fire-and-forget `exec` calls overlap.

### `__tests__/sound-monitor.spec.js` — got mocks and scraper tests (test, request-response)

**Analog:** mock setup and async scraper cases (lines 1-13, 132-174)

Use the existing module mock and real JSDOM parse. Configure the mock per test with `mockResolvedValue` for fixture HTML or `mockRejectedValue` for request failure. Assert arrays in DOM order for the new all-row helper; retain null assertions for unusable pages.

**Mock setup and scrape assertions** (lines 1-13, 132-174):

```javascript
const got = require('got');
const {
  buildState,
  BuildState,
  englishDictionary,
  MostRecentUpdate,
  timer,
  Status,
  normalizeStatus,
} = require('../index.js');

jest.mock('got');

test('buildState returns null when got rejects', async () => {
  got.mockRejectedValue(new Error('network down'));
  await expect(buildState('https://github.com/org/repo/actions')).resolves.toBeNull();
});

test('get content from github action', async () => {
  got.mockResolvedValue({ body: html });
  const state = await buildState();
  expect(state).toMatchObject({
    status: Status.SUCCESS,
    gitLog: 'trigger build',
    buildName: 'check_suite_10845785161',
  });
});
```

### `__tests__/sound-monitor.spec.js` — fixture factories and lifecycle tests (test, transform/event-driven)

**Analog:** inline live-shaped fixture, narrow label factory, and fresh updater creation (lines 14-125, 182-227, 230-235)

The established test fixture is live-shaped GitHub HTML, not a synthetic object passed directly to the scraper. Phase 2 should introduce a compact suite-row factory and a page factory in this same spec file, then use direct `new BuildState(...)` instances for store-only transition matrices. Create a new store per test exactly as the current suite creates a fresh updater.

**Fixture mutation and fresh-factory pattern** (lines 182-235):

```javascript
test('found a new build', () => {
  const state = new BuildState('build1', Status.SUCCESS, 'do something');
  const state2 = new BuildState('build2', Status.SUCCESS, 'do something');
  const mostRecentUpdate = MostRecentUpdate();
  const first = mostRecentUpdate(state);
  expect(first).toMatchObject({
    statement: `A new build 'do something' completed successfully.`,
    colorCode: expect.any(String),
  });
  const second = mostRecentUpdate(state2);
  expect(second).toMatchObject({
    statement: `A new build 'do something' completed successfully.`,
    colorCode: expect.any(String),
  });
});

function htmlWithAriaLabel(ariaLabel) {
  return html.replace(
    'aria-label="completed successfully"',
    `aria-label="${ariaLabel}"`
  );
}
```

**Required Phase 2 adaptation:** replace the fragile one-label replacement helper with `suiteRow({ id, ariaLabel, title })` and `suitePage(...rows)` so the multi-row order and malformed-sibling cases are readable. Store tests should assert full returned descriptor arrays, `has(id)`/`size` state, terminal drop, re-admission, title refresh, absent-id retention, `action_required`, and `unknown`.

### `__tests__/sound-monitor.spec.js` — require-time poller cleanup (test teardown, event-driven)

**Analog:** module-level interval cleanup (lines 127-130)

The poller is intentionally still started at module import in Phase 2. Every test file that requires `index.js` must retain this teardown until Phase 3 changes the entry-point boundary.

```javascript
afterAll((done) => {
  clearInterval(timer);
  done();
});
```

## Shared Patterns

### CommonJS exports and test seams
**Source:** `index.js` lines 218-227  
**Apply to:** the all-suite scraper, `InFlightBuildStore`, `BuildState`, and existing timer export.

```javascript
module.exports = {
  buildState,
  BuildState,
  say,
  englishDictionary,
  MostRecentUpdate,
  timer,
  Status,
  normalizeStatus,
};
```

Export pure helpers/factories required for direct Jest tests from this monolith. Preserve `timer` so the existing teardown remains valid.

### Null scrape means no state mutation
**Source:** `index.js` lines 104-107 and 206-213; `__tests__/sound-monitor.spec.js` lines 142-160  
**Apply to:** `actionSoundJob` before calling the new store.

```javascript
  } catch (err) {
    console.error(err);
    return null;
  }
}

const actionSoundJob = () => {
  buildState(githubActionURL).then(
    (newState) => {
      if (newState == null) return;
```

The store must not see `null`, and a successful snapshot does not imply deletion of ids absent from it.

### Unknown values stay silent
**Source:** `index.js` lines 117-133 and 149-164  
**Apply to:** scraper normalization and tracked `unknown` updates.

```javascript
    const statusPhrase = dictionary.translate(this.status);
    if (this.status === Status.UNKNOWN || statusPhrase === '') {
      return '';
    }
```

Keep a tracked unknown entry fresh but return no descriptor. This preserves the established no-invented-speech behavior while allowing a later known status transition.

## No Analog Found

| File / Responsibility | Role | Data Flow | Reason |
|---|---|---|---|
| `index.js` — Map-backed per-id lifecycle store | state factory | event-driven | No existing collection-based tracker; `MostRecentUpdate()` provides only the closure/factory and descriptor conventions, not the required Map lifecycle. |

## Metadata

**Analog search scope:** `index.js`, `__tests__/sound-monitor.spec.js`, `.planning/codebase/`  
**Files scanned:** 9  
**Pattern extraction date:** 2026-07-24
