<!-- refreshed: 2026-07-24 -->
# Architecture

**Analysis Date:** 2026-07-24

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 CLI / Polling Loop (entry)                   │
│                      `index.js`                              │
│  argv URL → setInterval(actionSoundJob, 5000ms)              │
├──────────────────┬──────────────────┬───────────────────────┤
│  Fetch & Parse   │  Diff / State    │  Announce / Output    │
│  `buildState()`  │  `MostRecentUpdate`│ `say()` + ANSI     │
│  got + JSDOM     │  `BuildState`    │  macOS `say` exec     │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              External: GitHub Actions HTML page              │
│         (public actions URL passed as CLI arg)               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Side effects: stderr (colored log) + macOS speech synth    │
│  Optional wrapper: `who.sh` (afplay on "failed" lines)      │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI entry / poller | Read Actions URL from argv; schedule poll every 5s; export modules for tests | `index.js` |
| `buildState` | HTTP GET Actions page; scrape check-suite id, status aria-label, commit message | `index.js` |
| `BuildState` | Hold build snapshot; produce spoken sentence via `diffToSentence`; map status → ANSI color | `index.js` |
| Dictionaries | Translate phrase keys / status strings (English active; Japanese present unused in poll path) | `index.js` |
| `MostRecentUpdate` | Closure tracking last build + seen build names; suppress stale / unchanged announcements | `index.js` |
| `say` | Print colored timestamped line to stderr; shell out to macOS `say` | `index.js` |
| Unit tests | Mock `got`; assert scrape, diff, and update-suppression behavior; clear poll timer | `__tests__/sound-monitor.spec.js` |
| Dev env bootstrap | Activate pnpm via corepack; recursive install | `set-env.sh` |
| Failure sound wrapper | Pipe monitor output; play MP3 when line contains `failed` | `who.sh` |
| CI | Install deps; run Jest on push/PR | `.github/workflows/ci.yml` |
| Release | CHANGELOG gate; version from tag; npm publish via OIDC | `.github/workflows/release.yml` |

## Pattern Overview

**Overall:** Single-file polling CLI (procedural + small domain objects)

**Key Characteristics:**
- Monolithic Node CommonJS module: fetch, domain model, i18n stubs, and I/O live in `index.js`
- Poll GitHub Actions HTML (not the Checks API); scrape with JSDOM selectors
- Stateful closure (`MostRecentUpdate`) diffs successive snapshots and de-duplicates by build id
- Side-effect announcement via ANSI stderr + macOS `say` (platform-bound)
- Published as npm bin `github_action_sound` → `./index.js`

## Layers

**Presentation / CLI:**
- Purpose: Accept URL; run forever; announce status changes
- Location: `index.js` (`actionSoundJob`, `setInterval`, `say`)
- Contains: Poll loop, colored logging, speech
- Depends on: Domain + fetch layers
- Used by: User via `pnpm sound` / `github_action_sound`; optionally `who.sh`

**Domain:**
- Purpose: Represent build snapshot and compute announcement text
- Location: `index.js` (`BuildState`, `MostRecentUpdate`, `englishDictionary`, `japaneseDictionary`)
- Contains: Status comparison, phrase translation, color lookup
- Depends on: Nothing external
- Used by: Poll loop and tests

**Integration / scraping:**
- Purpose: Turn Actions HTML into `BuildState`
- Location: `index.js` (`buildState`)
- Contains: `got` HTTP client, `JSDOM` selectors (`[id^='check_suite_']`, `svg[aria-label]`, `span.Link--primary`)
- Depends on: External GitHub HTML structure
- Used by: Poll loop and tests (with mocked `got`)

**Dev / release infrastructure:**
- Purpose: Reproducible Node/pnpm toolchain, CI, npm publish
- Location: `devbox.json`, `set-env.sh`, `.envrc`, `.github/workflows/*.yml`
- Contains: Devbox packages, direnv hook, workflows
- Depends on: GitHub Actions runners, npm registry OIDC
- Used by: Developers and release tags

## Data Flow

### Primary Request Path

1. CLI starts; last argv is treated as Actions URL (`index.js` — `githubActionURL = process.argv[...]`)
2. Every 5s, `actionSoundJob` calls `buildState(url)` (`index.js`)
3. `got(url)` fetches HTML; JSDOM selects first `[id^='check_suite_']` and reads id, `svg` `aria-label`, commit text (`index.js` — `buildState`)
4. `mostRecentUpdate(newState)` diffs against prior state / seen builds (`index.js` — `MostRecentUpdate`)
5. Non-empty statement passed to `say(statement, colorCode)` → stderr + `exec('say "..."')` (`index.js`)

### Optional Failure Sound Path

1. `who.sh` runs `pnpm sound <url>` and tees stderr/stdout
2. Lines containing `failed` trigger `afplay` of a local MP3
3. Complements (does not replace) the built-in `say` path

**State Management:**
- Module-level singleton: `mostRecentUpdate = MostRecentUpdate()` and `timer = setInterval(...)` in `index.js`
- Closure state: `lastBuildState`, `previousBuildNames[]` inside `MostRecentUpdate`
- No persistence across process restarts; no shared store or DB

## Key Abstractions

**`BuildState`:**
- Purpose: Immutable-ish snapshot of one check suite (name, status string, git log / commit message)
- Examples: `index.js`
- Pattern: Simple class with `diffToSentence(previous, dictionary)` and `colorCode()`

**Dictionary (translate object):**
- Purpose: Map internal keys / status phrases to spoken language
- Examples: `englishDictionary`, `japaneseDictionary` in `index.js`
- Pattern: Object with `translate(phrase)` returning map lookup or `` ` ${phrase}` `` fallback
- Prescriptive: Wire a dictionary into `diffToSentence` / `MostRecentUpdate` call sites; do not hardcode English strings in new announcement paths

**`MostRecentUpdate` factory:**
- Purpose: Produce a function that returns `{ statement, colorCode }` only for meaningful transitions
- Examples: `index.js`; covered in `__tests__/sound-monitor.spec.js`
- Pattern: Closure over mutable previous state; skip if `buildName` already in `previousBuildNames`

## Entry Points

**npm / Node CLI:**
- Location: `index.js` (`main` / `bin.github_action_sound` in `package.json`)
- Triggers: `github_action_sound <url>`, `pnpm sound`, `node ./index.js <url>`
- Responsibilities: Start poller immediately on require; export symbols for Jest

**Devbox shell:**
- Location: `devbox.json` → init hook `./set-env.sh`; direnv via `.envrc`
- Triggers: Entering repo with direnv/devbox
- Responsibilities: Pin Node 24.12 / pnpm 10.31; install deps

**CI:**
- Location: `.github/workflows/ci.yml`
- Triggers: Push/PR to `main` or `master`
- Responsibilities: `pnpm install --frozen-lockfile` then `pnpm test`

**Release:**
- Location: `.github/workflows/release.yml`
- Triggers: Push tags matching `v*`
- Responsibilities: Require `CHANGELOG.md` section; set version from tag; `npm publish` with OIDC

## Architectural Constraints

- **Threading:** Single-threaded Node event loop; `setInterval` + async `got`; `say` uses non-blocking `child_process.exec` (speech can overlap polls)
- **Global state:** Module-level `mostRecentUpdate`, `timer`, and `githubActionURL` in `index.js` — requiring the module for tests starts the poller (tests must `clearInterval(timer)`)
- **Circular imports:** None — single source module
- **Platform:** Speech requires macOS `say`; scraping depends on GitHub Actions HTML DOM (brittle if GitHub changes markup)
- **Auth:** Unauthenticated HTML scrape only — private repos / auth walls are out of scope
- **Package manager:** pnpm enforced via `preinstall` `only-allow pnpm` in `package.json`

## Anti-Patterns

### Require-time side effects

**What happens:** Loading `index.js` starts `setInterval` and reads argv immediately.
**Why it's wrong:** Tests and programmatic reuse must clear the timer; accidental require starts network polling.
**Do this instead:** Keep poller start behind `require.main === module` (or equivalent); export pure functions without starting the timer. Follow the existing test mitigation in `__tests__/sound-monitor.spec.js` (`afterAll` → `clearInterval(timer)`) until that split exists.

### HTML scraping as the integration contract

**What happens:** Status is derived from DOM selectors and `aria-label` text on the public Actions page.
**Why it's wrong:** Markup or label wording changes break scrape and announcements without compile-time signal.
**Do this instead:** Isolate selectors in `buildState` only; keep fixtures in `__tests__/sound-monitor.spec.js` updated when GitHub HTML changes; prefer GitHub API if auth and stability become requirements.

### Status string mismatch risk

**What happens:** `buildState` reads aria-labels like `completed successfully`, while `diffToSentence` / dictionaries also reference phrases with different punctuation/spacing (e.g. `'queued: '` vs spoken forms).
**Why it's wrong:** Color maps and suppress logic key off exact strings; mismatches yield silent empty announcements or wrong colors.
**Do this instead:** Normalize scraped status once into a closed enum before diff/color/dictionary steps; keep a single canonical set of status values.

## Error Handling

**Strategy:** Best-effort log-and-continue on fetch/parse; speech errors logged to stderr

**Patterns:**
- `buildState`: `try/catch` logs error with `console.error` and returns `undefined` (poll continues; calling `mostRecentUpdate` on undefined will throw — fragile)
- `say`: empty string short-circuits; `exec` callback logs `err` only
- Release workflow: hard-fail if CHANGELOG lacks `## [VERSION]` section

## Cross-Cutting Concerns

**Logging:** Colored timestamped messages to stderr via `say` / `console.error` in `index.js`; ANSI helpers defined at top of file
**Validation:** No argv/URL validation; last argv token used as URL as-is
**Authentication:** None for scrape path; npm publish uses Trusted Publishing OIDC in `.github/workflows/release.yml`

---

*Architecture analysis: 2026-07-24*
