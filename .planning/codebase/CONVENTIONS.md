# Coding Conventions

**Analysis Date:** 2026-07-24

## Naming Patterns

**Files:**
- Root entry and config use lowercase: `index.js`, `jest.config.js`, `babel.config.js`
- Test files use kebab-case with `.spec.js` suffix: `__tests__/sound-monitor.spec.js`
- Shell helpers are kebab/short names: `set-env.sh`, `who.sh`
- Workflows use kebab-case YAML: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

**Functions:**
- Use camelCase for functions: `now()`, `say()`, `buildState()`, `actionSoundJob()`
- Factory functions that return closures use PascalCase: `MostRecentUpdate()` in `index.js`
- Prefer named functions over anonymous exports for testable units

**Variables:**
- Use camelCase: `githubActionURL`, `lastBuildState`, `previousBuildNames`, `currentBuildElm`
- Constants for ANSI color codes use PascalCase: `FgRed`, `BgGreen`, `Reset` in `index.js`
- Prefer `const` for bindings that do not reassign; existing code still uses `var` in `now()` and `MostRecentUpdate()` — prefer `const`/`let` in new code

**Types:**
- No TypeScript; runtime shape is implied by constructors
- Domain objects use PascalCase class names: `BuildState` in `index.js`
- Dictionary objects use camelCase with a `translate` method: `englishDictionary`, `japaneseDictionary`

## Code Style

**Formatting:**
- No Prettier, ESLint, Biome, or EditorConfig in the repo
- Match surrounding style in the file you edit
- Indentation: 2 spaces (see `index.js`, `__tests__/sound-monitor.spec.js`)
- Semicolons: required (present throughout)
- Quotes: mixed single and double are already present; prefer single quotes for JS strings unless the string contains `'` (e.g. HTML fixtures in tests use backticks)

**Linting:**
- No JS linter configured
- Dependency version lint only: `pnpm lint:deps` → `syncpack lint` (`package.json`)
- Package manager enforced: `preinstall` runs `npx only-allow pnpm`

## Import Organization

**Order:**
1. Node built-ins (`child_process`)
2. External packages (`got`, `jsdom`)
3. Destructured exports from packages (`{ JSDOM }`)
4. Local requires (`../index.js` in tests)

**Path Aliases:**
- Not used — relative paths only (`require('../index.js')`)

**Module system:**
- CommonJS only: `require` / `module.exports`
- Do not introduce ESM (`import`/`export`) unless migrating the whole package and Jest/Babel setup

**Example pattern from `index.js`:**
```javascript
const { exec } = require('child_process');
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
```

## Error Handling

**Patterns:**
- Wrap async I/O in `try/catch` and log with `console.error` — see `buildState()` in `index.js`
- On scrape failure, `buildState()` logs and returns `undefined` (no rethrow)
- Callback errors from `exec` in `say()` are logged; speech still continues best-effort
- Do not throw for expected empty announcements: `say('')` returns early; `diffToSentence` returns `''` when unchanged
- Prefer explicit early returns over nested conditionals for no-op paths

**When adding new async work:**
- Catch at the boundary that talks to the network or shell
- Log the error object with `console.error(err)`
- Avoid silent failures that leave callers with partial state unless matching `buildState()`’s current contract

## Logging

**Framework:** `console` (no Winston/Pino/etc.)

**Patterns:**
- User-facing status lines go to `console.error` with ANSI color wrappers: `say(sentence, colorCode)` in `index.js`
- Timestamp every spoken/logged sentence via `now()`
- Errors from `got` / `exec` use `console.error` without extra framing
- Do not use `console.log` for the monitor’s primary output — the CLI pipes stderr in helpers like `who.sh`

## Comments

**When to Comment:**
- Minimal comments in application code; behavior is expressed in names and tests
- Document process/conventions in Cursor rules and README instead of inline essays
- Release/version rules live in `.cursor/rules/release.mdc` and `README.md`

**JSDoc/TSDoc:**
- Use JSDoc only where tooling needs it (e.g. `/** @type {import('jest').Config} */` in `jest.config.js`)
- Do not require JSDoc on every function

## Function Design

**Size:**
- Keep units small and exportable for Jest: `buildState`, `BuildState`, `MostRecentUpdate`, dictionaries
- Side-effectful CLI wiring (`setInterval`, argv URL) stays at module bottom in `index.js`

**Parameters:**
- Prefer plain values and small objects over options bags
- `BuildState.diffToSentence(previousState, dictionary)` takes an explicit dictionary with `.translate(phrase)`
- Status strings are compared as exact phrases (e.g. `'queued: '`, `'completed successfully: '`) — keep string literals consistent with GitHub Aria labels / dictionary keys

**Return Values:**
- `buildState(url)` → `BuildState` instance or `undefined` on error
- `diffToSentence` → sentence string or `''`
- `MostRecentUpdate()` → updater `(newState) => { statement, colorCode }`
- Export testable symbols via `module.exports` at the bottom of `index.js`

## Module Design

**Exports:**
- Export the public API from `index.js`:
  ```javascript
  module.exports = {
    buildState,
    BuildState,
    say,
    englishDictionary,
    MostRecentUpdate,
    timer,
  };
  ```
- Export `timer` so tests can `clearInterval(timer)` in `afterAll`
- Keep CLI entry (`#!/usr/bin/env node`, `setInterval`) in the same file as the library exports

**Barrel Files:**
- Not used — single-module package; do not add barrels without a real multi-file layout

**Equality:**
- Prefer `===` / `!==` in new code; existing code mixes `!=` and `!==` in `BuildState` / `MostRecentUpdate`

**Package / release conventions:**
- Use **pnpm** only (`packageManager` field + `only-allow`)
- Node engines: `>=24.12` (`package.json`); CI pins `24.12.0`
- Version source of truth is the git tag (`vMAJOR.MINOR.PATCH`); release workflow sets `package.json` version at publish time
- Update `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/)) with `## [X.Y.Z]` before tagging

---

*Convention analysis: 2026-07-24*
