# Testing Patterns

**Analysis Date:** 2026-07-24

## Test Framework

**Runner:**
- Jest `^30.2.0`
- Config: `jest.config.js`
- Transform: Babel via `babel-jest` + `babel.config.js` (`@babel/preset-env`, `targets: { node: 'current' }`)

**Assertion Library:**
- Jest built-in `expect` (no Chai/assert)

**Environment:**
- `testEnvironment: 'node'` in `jest.config.js`
- `transformIgnorePatterns` allow transforming pnpm-hoisted ESM deps (`got`, `jsdom`, related packages)

**Run Commands:**
```bash
pnpm test                 # Run all tests (package.json "test": "jest")
pnpm jest                 # Same via Jest CLI (also used by Devbox script)
devbox run test           # Devbox wrapper → pnpm jest
```

Watch mode and coverage are not scripted in `package.json`. Use Jest flags when needed:
```bash
pnpm jest --watch
pnpm jest --coverage
```

## Test File Organization

**Location:**
- Separate `__tests__/` directory at repo root (not co-located next to `index.js`)

**Naming:**
- `*.spec.js` — e.g. `__tests__/sound-monitor.spec.js`

**Structure:**
```
__tests__/
└── sound-monitor.spec.js   # All unit/integration tests for the monitor
```

## Test Structure

**Suite Organization:**
- Flat top-level `test(...)` blocks — no `describe` nesting in current suite
- One `afterAll` for process teardown (clear the module-level interval)

```javascript
const got = require('got');
const {
  buildState,
  BuildState,
  englishDictionary,
  MostRecentUpdate,
  timer,
} = require('../index.js');

jest.mock('got');

afterAll((done) => {
  clearInterval(timer);
  done();
});

test('get content from github action', async () => {
  got.mockResolvedValue({ body: html });
  const state = await buildState();
  expect(state).toMatchObject({
    status: 'completed successfully',
    gitLog: 'trigger build',
    buildName: 'check_suite_10845785161',
  });
});
```

**Patterns:**
- Setup: mock HTTP responses before calling `buildState`
- Teardown: always `clearInterval(timer)` because requiring `index.js` starts `setInterval(..., 5000)`
- Assertions: prefer `toMatchObject` for partial object shape; use `toContain` / exact string equality for sentences

## Mocking

**Framework:** Jest module mocks (`jest.mock`)

**Patterns:**
```javascript
jest.mock('got');

test('get content from github action', async () => {
  got.mockResolvedValue({ body: html });
  const state = await buildState();
  expect(state).toMatchObject({ /* ... */ });
});
```

**What to Mock:**
- Network clients (`got`) — never hit live GitHub Actions pages in unit tests
- Keep HTML fixtures as static strings that mirror GitHub DOM selectors used in `buildState()` (`[id^='check_suite_']`, `svg[aria-label]`, `span.Link--primary`)

**What NOT to Mock:**
- `BuildState`, `MostRecentUpdate`, dictionaries — exercise real domain logic
- `jsdom` — real parsing of fixture HTML is intentional for scrape tests

**Side-effect note:**
- Importing `../index.js` starts the poller and exports `timer`; tests must clear it
- When adding tests that import `index.js`, retain or extend the `afterAll` cleanup

## Fixtures and Factories

**Test Data:**
```javascript
const html = `
<div ... id="check_suite_10845785161" ...>
  <svg ... aria-label="completed successfully" ...></svg>
  <span class="Link--primary ..." ...>trigger build</a>
  ...
</div>
`;

const state = new BuildState(
  'build1',
  'completed successfully.',
  'do something'
);
```

**Location:**
- Inline in `__tests__/sound-monitor.spec.js` (no `__fixtures__/` directory)
- Construct `BuildState` instances directly in each test for status-transition scenarios

**Factory under test:**
- Call `MostRecentUpdate()` per test to get a fresh updater with isolated closure state
- Do not reuse a single updater across unrelated tests

## Coverage

**Requirements:** None enforced (no `coverageThreshold` in `jest.config.js`, no CI coverage gate)

**View Coverage:**
```bash
pnpm jest --coverage
```

**Current coverage focus (by existing tests):**
- Covered: HTML scrape → `BuildState` fields; `diffToSentence` / `MostRecentUpdate` transitions; duplicate-build suppression
- Gaps: `say()` / `exec('say ...')`; `japaneseDictionary`; `colorCode()` mappings; error path of `buildState()` when `got` rejects; CLI argv / interval wiring

## Test Types

**Unit Tests:**
- `BuildState.diffToSentence` with `englishDictionary`
- `MostRecentUpdate()` closure: new build, status change, old build returning

**Integration Tests:**
- `buildState` + mocked `got` + real `jsdom` parse of GitHub-like HTML fixture in `__tests__/sound-monitor.spec.js`

**E2E Tests:**
- Not used — no Playwright/Cypress; live Mac `say` / Actions polling is manual (`pnpm sound`, `who.sh`)

## Common Patterns

**Async Testing:**
```javascript
test('get content from github action', async () => {
  got.mockResolvedValue({ body: html });
  const state = await buildState();
  expect(state).toMatchObject({ status: 'completed successfully' });
});
```

**Error Testing:**
- Not yet present — when adding, mock `got` to reject and assert `buildState` returns `undefined` while logging (match `index.js` catch behavior)

**State-transition testing:**
```javascript
const mostRecentUpdate = MostRecentUpdate();
expect(mostRecentUpdate(state)).toMatchObject({
  statement: `A new build 'do something' is currently running.`,
  colorCode: undefined,
});
expect(mostRecentUpdate(state2)).toMatchObject({
  statement: `The build completed successfully.`,
  colorCode: undefined,
});
```

**CI integration:**
- `.github/workflows/ci.yml` and `.github/workflows/release.yml` both run `pnpm test` after `pnpm install --frozen-lockfile`
- New tests must pass under Node `24.12.0` on `ubuntu-latest`

**When adding a new test:**
1. Put it in `__tests__/` as `*.spec.js` (extend `sound-monitor.spec.js` or add a sibling)
2. Require exports from `../index.js`; mock externals at the top
3. Ensure timer cleanup still runs in `afterAll`
4. Prefer `toMatchObject` for `BuildState`-like results and explicit sentence strings for announcements
5. Keep fixtures aligned with selectors in `buildState()` in `index.js`

---

*Testing analysis: 2026-07-24*
