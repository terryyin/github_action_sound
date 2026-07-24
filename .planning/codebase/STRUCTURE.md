# Codebase Structure

**Analysis Date:** 2026-07-24

## Directory Layout

```
github_action_sound/
├── index.js                 # Sole application source: CLI, scrape, domain, speech
├── package.json             # Package metadata, bin, scripts, engines, deps
├── pnpm-lock.yaml           # Locked dependency tree
├── pnpm-workspace.yaml      # pnpm settings (onlyBuiltDependencies)
├── babel.config.js          # Babel preset for Jest transform
├── jest.config.js           # Jest Node env + transformIgnorePatterns
├── __tests__/               # Jest specs (co-located test tree, not under src/)
│   └── sound-monitor.spec.js
├── .github/workflows/       # CI and release pipelines
│   ├── ci.yml
│   └── release.yml
├── set-env.sh               # Devbox init: corepack pnpm + install
├── who.sh                   # Optional wrapper: afplay on failure lines
├── devbox.json              # Devbox Node/pnpm toolchain
├── .envrc                   # direnv → devbox
├── .cursor/rules/           # Cursor guidance (release process)
│   └── release.mdc
├── README.md                # Usage and releasing
├── CHANGELOG.md             # Keep a Changelog (release gate)
├── LICENSE                  # MIT
└── .planning/codebase/      # GSD architecture maps (this doc set)
```

## Directory Purposes

**Repository root:**
- Purpose: Flat Node CLI package — all runtime logic lives in one file at root
- Contains: `index.js`, package manifests, Jest/Babel config, shell helpers
- Key files: `index.js`, `package.json`, `jest.config.js`

**`__tests__/`:**
- Purpose: Automated tests for scrape and state-diff behavior
- Contains: `*.spec.js` Jest suites
- Key files: `__tests__/sound-monitor.spec.js`

**`.github/workflows/`:**
- Purpose: Continuous integration and npm release automation
- Contains: YAML workflows
- Key files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

**`.cursor/rules/`:**
- Purpose: Agent/editor conventions for releases
- Contains: Cursor rule markdown
- Key files: `.cursor/rules/release.mdc`

**`.planning/codebase/`:**
- Purpose: Generated GSD codebase analysis for planning/execution
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`, and sibling focus docs
- Key files: this directory’s `*.md` maps

## Key File Locations

**Entry Points:**
- `index.js`: Runtime CLI and exported domain/API for tests
- `package.json` → `bin.github_action_sound`: Published command name
- `package.json` → `scripts.sound`: Local `node ./index.js`
- `who.sh`: Optional failure-audio wrapper around `pnpm sound`

**Configuration:**
- `package.json`: Engines (`node` >= 24.12, `pnpm` >= 10.31), deps, scripts
- `jest.config.js`: Test environment and ESM-dep transform allowlist
- `babel.config.js`: `@babel/preset-env` for Jest
- `devbox.json`: Local Node/pnpm pins and test script
- `.envrc`: direnv integration with Devbox
- `pnpm-workspace.yaml`: pnpm `onlyBuiltDependencies` (not a multi-package workspace of apps)

**Core Logic:**
- `index.js`: `buildState`, `BuildState`, dictionaries, `MostRecentUpdate`, `say`, poller

**Testing:**
- `__tests__/sound-monitor.spec.js`: Mocks `got`; covers scrape + update rules

**CI / Release:**
- `.github/workflows/ci.yml`: Test on push/PR
- `.github/workflows/release.yml`: Tag-driven npm publish
- `CHANGELOG.md`: Required section per release version
- `.cursor/rules/release.mdc`: Documented release conventions

## Naming Conventions

**Files:**
- Application: single root `index.js` (CommonJS)
- Tests: `__tests__/<feature>.spec.js` (Jest `*.spec.js`)
- Shell helpers: kebab/short names with `.sh` (`set-env.sh`, `who.sh`)
- Workflows: lowercase descriptive YAML (`ci.yml`, `release.yml`)

**Directories:**
- Tests under `__tests__/` (not `test/` or co-located `*.test.js` beside `index.js`)
- GitHub Actions under `.github/workflows/`
- No `src/` directory — do not invent one unless splitting the monolith

**Symbols in `index.js`:**
- Classes: PascalCase (`BuildState`)
- Factories / closures: PascalCase factory returning function (`MostRecentUpdate`)
- Functions: camelCase (`buildState`, `say`, `actionSoundJob`, `now`)
- Constants: camelCase or PascalCase for ANSI (`FgRed`, `englishDictionary`)

## Where to Add New Code

**New Feature (domain / announcement behavior):**
- Primary code: extend `index.js` (or extract a sibling module at repo root only if the file grows past maintainability)
- Tests: add cases in `__tests__/sound-monitor.spec.js` or new `__tests__/<name>.spec.js`
- Prefer: keep scrape selectors in `buildState`; keep speech/IO in `say`; keep diff logic on `BuildState` / `MostRecentUpdate`

**New Component/Module:**
- Implementation: root-level `*.js` CommonJS module required from `index.js` (there is no `src/` layer)
- Export via `module.exports` to match existing style
- Ensure requiring the module does not start the poller unless it is the CLI entry

**Utilities:**
- Shared helpers: add near related functions in `index.js`, or a small `lib/` / root helper file if reused across modules
- Do not put runtime helpers under `__tests__/` or `.github/`

**CI / release changes:**
- Workflows: `.github/workflows/`
- Versioning docs: `CHANGELOG.md`, `.cursor/rules/release.mdc`, `README.md`

**Dev tooling:**
- Toolchain pins: `devbox.json`, `set-env.sh`, `package.json` engines/`packageManager`

## Special Directories

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (listed in `.gitignore`)

**`.planning/`:**
- Purpose: GSD planning artifacts including codebase maps
- Generated: Partially (maps written by mapper agents)
- Committed: Per project GSD practice (orchestrator may commit)

**`.cursor/`:**
- Purpose: Cursor IDE rules for this repo
- Generated: No
- Committed: Yes

**`__tests__/`:**
- Purpose: Jest suite
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-07-24*
