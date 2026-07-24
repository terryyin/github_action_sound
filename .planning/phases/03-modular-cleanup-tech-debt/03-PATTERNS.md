# Phase 03: Modular Cleanup + Tech Debt - Pattern Map

**Mapped:** 2026-07-24  
**Files analyzed:** 8  
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scrape.js` | service | request-response / transform | `index.js` | exact extraction |
| `status.js` | model / utility | transform | `index.js` | exact extraction |
| `store.js` | store | event-driven / transform | `index.js` | exact extraction |
| `announce.js` | service / utility | event-driven | `index.js` | role-match (hardened boundary) |
| `index.js` | provider / barrel | request-response orchestration | `index.js` | exact refactor |
| `cli.js` | CLI entry | event-driven | `index.js` | role-match (lifecycle extraction) |
| `package.json` | config | process-entry configuration | `package.json` | exact modification |
| `__tests__/sound-monitor.spec.js` | test | request-response / event-driven | `__tests__/sound-monitor.spec.js` | exact extension |

## Pattern Assignments

### `scrape.js` (service, request-response / transform)

**Analog:** `index.js`

**Imports and dependency pattern** (lines 4-6):
```javascript
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
```

**Core scrape and normalization-boundary pattern** (lines 93-117):
```javascript
async function buildStates(url) {
  try {
    const resp = await got(url);
    const dom = new JSDOM(resp.body);
    const rows = dom.window.document.querySelectorAll("[id^='check_suite_']");
    if (rows.length === 0) return null;

    const states = [];
    for (const row of rows) {
      const svg = row.querySelector('svg[aria-label]');
      const title = row.querySelector('span.Link--primary');
      const aria = svg && svg.getAttribute('aria-label');
      if (!row.id || !svg || !aria || !title) {
        console.error('Skipping malformed check suite:', row.id);
        continue;
      }
      states.push(
        new BuildState(row.id, normalizeStatus(aria), title.textContent.trim())
      );
    }
    return states.length > 0 ? states : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

**Apply:** Require `BuildState` and `normalizeStatus` from `./status`; retain selector strings, DOM order, malformed-row logging, and `null` returns verbatim. The module must not initiate polling.

---

### `status.js` (model / utility, transform)

**Analog:** `index.js`

**Canonical status vocabulary and unknown fallback** (lines 63-90):
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

**Build descriptor and speech-suppression pattern** (lines 120-156):
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
      return dictionary.translate('new_build') + `'${this.gitLog}'` + statusPhrase;
    }
    if (this.status !== Status.QUEUED && this.status != previousState.status) {
      return dictionary.translate('the_build') + ` '${this.gitLog}'` + statusPhrase;
    }
    return '';
  }

  colorCode() {
    return {
      [Status.QUEUED]: BgBlue + FgYellow + Blink,
      [Status.RUNNING]: BgBlue + FgYellow + Blink,
      [Status.SUCCESS]: BgGreen + FgBlack,
      [Status.FAILURE]: BgRed + FgYellow + Blink,
      [Status.CANCELLED]: BgYellow + FgBlack,
      [Status.SKIPPED]: Dim,
      [Status.ACTION_REQUIRED]: BgYellow + FgBlack + Blink,
    }[this.status];
  }
}
```

**Dictionary pattern** (lines 159-175):
```javascript
const englishDictionary = {
  translate: function (phrase) {
    return (
      {
        new_build: 'A new build ',
        the_build: 'The build',
        [Status.QUEUED]: ' has been queued.',
        [Status.RUNNING]: ' is currently running.',
        [Status.SUCCESS]: ' completed successfully.',
        [Status.FAILURE]: ' failed.',
        [Status.CANCELLED]: ' was cancelled.',
        [Status.SKIPPED]: ' was skipped.',
        [Status.ACTION_REQUIRED]: ' requires action.',
      }[phrase] || ''
    );
  },
};
```

**Apply:** Move the ANSI color constants needed by `colorCode`, `Status`, `statusHead`, `normalizeStatus`, `BuildState`, and `englishDictionary` unchanged. Do not move `japaneseDictionary`; it is explicitly removed.

---

### `store.js` (store, event-driven / transform)

**Analog:** `index.js`

**Lifecycle predicates and closure-backed Map pattern** (lines 194-255):
```javascript
function isInFlight(status) {
  return status === Status.QUEUED || status === Status.RUNNING;
}

function isTerminal(status) {
  return [
    Status.SUCCESS,
    Status.FAILURE,
    Status.CANCELLED,
    Status.SKIPPED,
  ].includes(status);
}

const InFlightBuildStore = () => {
  const statesById = new Map();

  function descriptor(next, previous) {
    return {
      statement: next.diffToSentence(previous, englishDictionary),
      colorCode: next.colorCode(),
    };
  }
```

**Admission, update, and retirement ordering** (lines 217-255):
```javascript
  function apply(states) {
    const announcements = [];
    for (const next of states) {
      const previous = statesById.get(next.buildName);
      if (!previous) {
        if (isInFlight(next.status)) {
          statesById.set(next.buildName, next);
          announcements.push(descriptor(next, new BuildState('', '')));
        }
        continue;
      }

      if (next.status === Status.UNKNOWN) {
        statesById.set(next.buildName, next);
        continue;
      }

      const announcement = descriptor(next, previous);
      statesById.set(next.buildName, next);
      if (announcement.statement !== '') {
        announcements.push(announcement);
      }
      if (isTerminal(next.status)) {
        statesById.delete(next.buildName);
      }
    }

    return announcements;
  }

  return {
    apply,
    has: (id) => statesById.has(id),
    get: (id) => statesById.get(id),
    get size() {
      return statesById.size;
    },
  };
};
```

**Apply:** Import `Status`, `BuildState`, and `englishDictionary` from `./status`. Preserve iteration order and all mutation ordering; no absence sweep, queue, or mutex is permitted.

---

### `announce.js` (service / utility, event-driven)

**Analog:** `index.js`

**Output formatting and best-effort callback pattern** (lines 34-60):
```javascript
function now() {
  var currentdate = new Date();
  return (
    currentdate.getDate() +
    '/' +
    (currentdate.getMonth() + 1) +
    '/' +
    currentdate.getFullYear() +
    '@' +
    currentdate.getHours() +
    ':' +
    currentdate.getMinutes() +
    ':' +
    currentdate.getSeconds()
  );
}

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
```

**Apply:** Retain the empty-input short circuit, stderr timestamped output, asynchronous fire-and-forget callback, and error logging. Replace only the unsafe call with `execFile('say', [sentence], callback)` from `child_process`; never add `shell: true` or await speech.

---

### `index.js` (provider / barrel, request-response orchestration)

**Analog:** `index.js`

**Injected composition helper** (lines 259-272):
```javascript
const actionSoundJob = async (
  url = githubActionURL,
  announce = say,
  store = inFlightBuildStore
) => {
  const states = await buildStates(url);
  if (states == null) return [];

  const announcements = store.apply(states);
  for (const announcement of announcements) {
    announce(announcement.statement, announcement.colorCode);
  }
  return announcements;
};
```

**Current export convention** (lines 276-286):
```javascript
module.exports = {
  buildStates,
  BuildState,
  say,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  timer,
  Status,
  normalizeStatus,
};
```

**Apply:** Keep `actionSoundJob` with explicit injected `url`, `announce`, and `store` inputs, but remove module-scope `process.argv`, default singleton store, interval creation, and `timer` export. Require and re-export the four module APIs in CommonJS form; require-time work must be limited to loading declarations.

---

### `cli.js` (CLI entry, event-driven)

**Analog:** `index.js`

**Current process-lifecycle seam** (lines 192 and 257-274):
```javascript
const githubActionURL = process.argv[process.argv.length - 1];
const inFlightBuildStore = InFlightBuildStore();

const actionSoundJob = async (
  url = githubActionURL,
  announce = say,
  store = inFlightBuildStore
) => {
  // scrape, apply, and announce
};

const timer = setInterval(actionSoundJob , 5000);
```

**Apply:** Move the argv read, one store construction, and 5-second interval into this executable-only file. Add the existing `#!/usr/bin/env node` shebang from `index.js` line 1; import `actionSoundJob`, `InFlightBuildStore`, and `say` through `./index` so `cli.js` owns all persistent runtime state.

---

### `package.json` (config, process-entry configuration)

**Analog:** `package.json`

**Current executable mapping** (lines 5 and 10-15; lines 38-40):
```json
"main": "index.js",
"scripts": {
  "preinstall": "npx only-allow pnpm",
  "lint:deps": "syncpack lint",
  "test": "jest",
  "sound": "node ./index.js"
},
"bin": {
  "github_action_sound": "./index.js"
}
```

**Apply:** Keep `main` at the side-effect-free `index.js`; change only the `sound` script and `bin.github_action_sound` target to `./cli.js`. Preserve engines, package manager pin, and tag-derived release-version policy.

---

### `__tests__/sound-monitor.spec.js` (test, request-response / event-driven)

**Analog:** `__tests__/sound-monitor.spec.js`

**Module import and dependency mock convention** (lines 1-13):
```javascript
const got = require('got');
const {
  buildStates,
  BuildState,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  timer,
  Status,
  normalizeStatus,
} = require('../index.js');

jest.mock('got');
```

**Injected job test pattern** (lines 146-204):
```javascript
const store = InFlightBuildStore();
const announce = jest.fn();

await actionSoundJob(url, announce, store);
expect(store.size).toBe(2);
expect(announce.mock.calls.map(([statement]) => statement)).toEqual([
  "A new build 'same title' is currently running.",
  "A new build 'same title' has been queued.",
]);
```

**Existing import-time timer workaround to remove** (lines 141-144):
```javascript
afterAll((done) => {
  clearInterval(timer);
  done();
});
```

**Apply:** Continue testing the public barrel and injected orchestration. Mock `child_process` before requiring `announce.js` (or reset modules then require) to assert `execFile` receives `'say'` and `[sentence]`; remove `timer` import and cleanup. Add a focused require-side-effect assertion using mocked `setInterval` and `got`.

## Shared Patterns

### CommonJS exports
**Source:** `index.js` lines 276-286  
**Apply to:** All four extracted library modules and the barrel.

```javascript
module.exports = {
  buildStates,
  BuildState,
  say,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  timer,
  Status,
  normalizeStatus,
};
```

Use named properties with `require('./module')`; omit `timer` in the new import-safe library graph.

### Null-as-no-scrape contract
**Source:** `index.js` lines 264-271  
**Apply to:** `scrape.js` and `index.js`.

```javascript
const states = await buildStates(url);
if (states == null) return [];

const announcements = store.apply(states);
for (const announcement of announcements) {
  announce(announcement.statement, announcement.colorCode);
}
```

Never call `store.apply` on a failed or empty scrape.

### Best-effort stderr error handling
**Source:** `index.js` lines 114-117 and 55-60  
**Apply to:** `scrape.js` and `announce.js`.

```javascript
} catch (err) {
  console.error(err);
  return null;
}
```

```javascript
if (err) {
  console.error(err);
}
```

Log operational failures and continue polling; do not throw from speech callbacks.

### Test fixture and mock style
**Source:** `__tests__/sound-monitor.spec.js` lines 15-26 and 175-178  
**Apply to:** all new Phase 3 tests.

```javascript
function suiteRow({ id, ariaLabel, title }) {
  return `
    <div id="${id}">
      <svg aria-label="${ariaLabel}"></svg>
      <span class="Link--primary">${title}</span>
    </div>
  `;
}

got
  .mockResolvedValueOnce({ body: firstPage })
  .mockResolvedValueOnce({ body: firstPage })
  .mockResolvedValueOnce({ body: secondPage });
```

Use live-shaped aria-label fixtures and `jest.mock` conventions already exercised by the suite.

## No Analog Found

None. The package is a single-file monolith, so each new module has a direct extraction analog in `index.js`; `cli.js` is a focused extraction of its current process-lifecycle block.

## Metadata

**Analog search scope:** repository root, `__tests__/`, `.cursor/rules/`  
**Files scanned:** 6 (`index.js`, `package.json`, `README.md`, `__tests__/sound-monitor.spec.js`, `jest.config.js`, `.cursor/rules/release.mdc`)  
**Pattern extraction date:** 2026-07-24
