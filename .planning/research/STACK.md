# Stack Research

**Domain:** macOS Node CLI — GitHub Actions status poller (HTML scrape) + local speech announce  
**Researched:** 2026-07-24  
**Confidence:** MEDIUM–HIGH (registry versions HIGH; keep/upgrade policy HIGH; ecosystem comparisons MEDIUM)  
**Mode:** Brownfield subsequent milestone — concurrent multi-build tracking, status normalization, modular refactor  
**Constraint:** Do **not** replace the whole stack unless clearly necessary

## Verdict (keep vs change)

| Current | Verified current (2026-07-24) | Recommendation | Confidence |
|---------|-------------------------------|----------------|------------|
| Node `>=24.12` (CI/devbox `24.12.0`) | Node **24.18.0** LTS “Krypton” | **KEEP** engines `>=24.12`; optional CI/devbox bump to latest 24.x LTS | HIGH |
| pnpm `10.31.0` (`packageManager`) | pnpm **10.34.5** (10.x); **11.17.0** latest major | **KEEP pnpm 10.x**; optional patch → `10.34.5`. Do **not** jump to pnpm 11 this milestone | HIGH |
| `got@11.8.6` | `got@15.1.0` (ESM-only since v12) | **KEEP `got@11.8.6`** for this milestone | HIGH |
| `jsdom@26.1.0` | `jsdom@29.1.1` | **KEEP `26.1.0` through reliability work**; optional cleanup bump → `29.1.1` if tests pass | HIGH |
| `jest@^30.2.0` + `babel-jest@^30.2.0` | `jest@30.4.2` | **KEEP Jest 30 line**; allow patch to `30.4.x` | HIGH |
| `child_process.exec` + shell string for `say` | Node 24 `execFile` / `spawn` argv APIs | **CHANGE** to `execFile('say', [sentence])` (stdlib only) | HIGH |
| Single-file CJS monolith | — | **KEEP CJS + Node stdlib** modules; split files later, no new framework | HIGH |
| HTML scrape (public Actions page) | REST `GET /repos/.../actions/runs` works unauthenticated for public repos | **KEEP HTML scrape** this milestone (project decision); do not add Octokit | HIGH |

**Bottom line:** The 2025/2026 *standard* for a greenfield Node 24 CLI would lean on **built-in `fetch` + a light HTML parser + Jest + pnpm**. For *this* brownfield repo, the correct move is **stabilize on the current CJS stack**, fix speech spawning and multi-build state in stdlib, and defer ESM/`got@15` (or `fetch`) and any API client to a later milestone.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | `>=24.12` (prefer latest 24.x LTS, e.g. `24.18.0`) | Runtime for CLI bin | Already pinned; Node 24 is current LTS (Krypton). Built-in `fetch` exists if HTTP is swapped later — no need to change runtime for multi-build. |
| JavaScript CommonJS | status quo (`require` / `module.exports`) | App + tests | Entire product and Jest config are CJS. Migrating to ESM only to chase `got@15` is a stack rewrite — out of scope. |
| pnpm | `10.31.0` → optional `10.34.5` | Package manager | Already enforced via `only-allow` + `packageManager`. Stay on 10.x; Corepack pin stays simple. |
| `got` | **`11.8.6` (pin exact)** | HTTP GET of Actions HTML | Last CommonJS-compatible major. `got@12+` / current `15.1.0` are `"type": "module"` and maintainers mark v11 unmaintained with no backports — upgrading forces ESM or awkward `await import('got')`. Not worth it mid reliability work. |
| `jsdom` | **`26.1.0` keep**; optional **`29.1.1`** in cleanup | Parse Actions HTML; `querySelector` / `querySelectorAll` | Matches existing scrape code. v29 engines (`^20.19 \|\| ^22.13 \|\| >=24`) fit Node 24. Do not switch to cheerio during multi-build — selector rewrite risk for zero product gain. |
| Jest | **`^30.2.0` → allow `30.4.x`** (`30.4.2` current) | Unit tests + `jest.mock('got')` | Already on Jest 30; engines include `>=24`. Keep Babel transform for pnpm ESM-leaning deps. |
| Node `child_process.execFile` | built-in (Node 24) | Invoke macOS `say` | Prefer argv array over `exec('say "…"')` to eliminate shell injection; overlapping speeches remain fire-and-forget. |
| Plain `Map` / objects | stdlib | Concurrent in-flight run tracking | Standard for single-process pollers; no Redux/Zustand/SQLite. Key by check-suite id (and/or title); drop on terminal status. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@babel/core` + `@babel/preset-env` + `babel-jest` | `^7.29` / `^30.2` (existing) | Transform ESM-leaning deps under Jest + pnpm | **Keep** while `got@11` / jsdom graph needs `transformIgnorePatterns` allowlist. Drop only if HTTP client moves to built-in `fetch` and Jest no longer hits ESM-only packages. |
| `syncpack` | `14.2.0` (existing) | Dependency version lint | Keep; no change for multi-build. |
| `only-allow` (via `npx` preinstall) | as today | Enforce pnpm | Keep. |
| Built-in `fetch` (undici-in-Node) | Node 24 global | Future HTTP client | **Later milestone** if dropping unmaintained `got@11` without adopting ESM `got@15`. Not required for concurrent tracking. |
| `cheerio` | `1.2.0` (registry) | Lightweight HTML parse | **Only if** intentionally rewriting scrape API away from DOM `querySelector`. Not for this milestone. |
| `@octokit/rest` | `22.0.1` (registry) | GitHub Actions REST | **Not this milestone.** Public HTML scrape is a locked product decision; API is a future option for structured multi-run status. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Jetify Devbox + direnv | Pin Node/pnpm | Keep; optionally refresh Node package to `24.18.x` |
| Corepack | Activate `packageManager` pnpm | Keep |
| GitHub Actions CI (Jest) + OIDC npm publish | Existing delivery | Keep; no stack change for multi-build |

## Keep vs upgrade (explicit)

### `got@11.8.6` — **KEEP** (this milestone)

- **Why keep:** Project is CJS. `got` is ESM-only from v12; latest is `15.1.0`. Official readme: use v11 if you cannot convert to ESM; v11 is unmaintained (no backports).
- **Why not upgrade now:** ESM migration + Jest experimental ESM + Babel/config churn blocks reliability work.
- **Later options (pick one, not both):** (1) ESM + `got@15.1.0`, or (2) stay CJS and replace with Node `fetch` + `response.text()`. Prefer (2) for a small CLI unless got retries/hooks become necessary.

### `jsdom@26.1.0` — **KEEP**, optional patch/major later

- **Why keep for reliability phases:** Scrape already uses `JSDOM` + `querySelector`; multi-build only needs `querySelectorAll` on the same API.
- **Optional cleanup upgrade:** `jsdom@29.1.1` — still CommonJS (`type` unset / CJS), Node 24 compatible. Run full Jest suite after bump; refresh HTML fixtures if parse behavior drifts.
- **Do not replace with cheerio** unless scrape module is rewritten on purpose (jQuery API ≠ DOM API).

### `jest@30` — **KEEP** (patch OK)

- Current: `jest@^30.2.0`. Registry: `30.4.2`. Engines include Node `>=24`.
- **Keep** CJS `jest.mock`, existing `transformIgnorePatterns` for pnpm paths.
- **Do not** migrate to Vitest or enable `--experimental-vm-modules` unless adopting ESM app code.

### Node `>=24.12` — **KEEP**

- Current LTS line is 24.x (`24.18.0` as of research date). Engines already correct.
- Optional: bump Devbox/CI pin from `24.12.0` → latest 24.x for security patches — not a product dependency.

### pnpm `10.31` — **KEEP major**; optional patch

- Latest 10.x: `10.34.5`. Latest major: `11.17.0`.
- **Keep 10.x** during reliability/refactor. Bumping to 11 is unrelated risk (lockfile/Corepack/CI). If patching: `packageManager` → `pnpm@10.34.5` + refresh lock via Corepack.

## Installation

No new runtime dependencies required for the milestone goals.

```bash
# Already installed (keep)
# got@11.8.6  jsdom@26.1.0

# Optional cleanup-only bumps (after reliability lands)
pnpm add -D jest@^30.4.2 babel-jest@^30.4.2
pnpm add jsdom@29.1.1   # only with green tests + fixture check

# Optional toolchain patch
# Update packageManager to pnpm@10.34.5 and reinstall under Corepack

# Do NOT add for this milestone
# pnpm add got@15 cheerio @octokit/rest commander chalk
```

Speech and multi-build state use **Node built-ins only**:

```javascript
const { execFile } = require('node:child_process');
execFile('say', [sentence], (err) => {
  if (err) console.error(err);
});

/** @type {Map<string, { status: string, title: string }>} */
const inFlight = new Map();
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `got@11.8.6` | `got@15.1.0` (ESM) | Separate milestone converting package to `"type": "module"` end-to-end |
| `got@11.8.6` | Node built-in `fetch` | Next HTTP cleanup while remaining CJS; drop got + shrink Jest ESM allowlist |
| `jsdom@26` | `cheerio@1.2.0` | Greenfield scrape or deliberate rewrite for lower memory; not mid multi-build |
| HTML scrape | GitHub REST `/actions/runs` (+ optional `@octokit/rest`) | Want stable structured statuses without DOM; public repos work without auth — **out of scope** for this milestone |
| `execFile('say', …)` | `node-notifier` / afplay-only | Different UX; product requires `say` |
| Jest 30 | Vitest | Only if migrating to ESM/Vite-style tooling later |
| Manual modules | `commander` / `yargs` | Only if CLI grows flags/config; today argv is one URL |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `got@12`–`@15` without ESM migration | Native ESM; breaks CJS `require('got')` | Keep `got@11.8.6` or switch to `fetch` |
| `got-cjs` / unofficial CJS forks | Stale relative to got 15; supply-chain/maintenance risk | Official got@11 or `fetch` |
| `child_process.exec` with interpolated speech | Shell metacharacters in commit titles → injection / broken `say` | `execFile('say', [sentence])` |
| Playwright / Puppeteer | Heavy browser for static Actions HTML | `got` + `jsdom` |
| `@octokit/*` this milestone | Auth/API surface + URL-shape change; contradicts “stay on HTML scrape” | Continue scrape; normalize statuses in domain layer |
| TypeScript conversion this milestone | Large blast radius; not required for multi-build correctness | Stay JS CJS; optional TS later |
| New state/HTTP frameworks (Redux, axios, express) | Overkill for a local poller | `Map` + `setInterval` + existing clients |
| Speech queues / mutex libraries | Product accepts overlapping `say` | Fire-and-forget `execFile` |
| `node-fetch` | Obsolete on Node 18+ when `fetch` is global | Built-in `fetch` if replacing got |

## Stack Patterns by Variant

**If staying on HTML scrape (this milestone — default):**
- Keep `got@11` + `jsdom`
- Change scrape to `querySelectorAll("[id^='check_suite_']")`
- Normalize aria-label strings to a closed status enum before color/speech
- Track in-flight runs in a `Map`; announce transitions; delete on terminal
- Modularize after behavior is green (`scrape`, `state`, `announce`, `cli`)

**If later abandoning unmaintained got while staying CJS:**
- Replace `got(url)` with `const res = await fetch(url); const body = await res.text()`
- Keep `jsdom` (or consider cheerio in the same change)
- Simplify Jest `transformIgnorePatterns` once got is gone

**If later adopting GitHub API for multi-run:**
- Prefer built-in `fetch` to `api.github.com` (public, no token) before adding Octokit
- Parse `status` / `conclusion` instead of aria-labels
- Still use `execFile` + stderr announce; keep poll interval model

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `got@11.8.6` | Node `>=10.19` / project Node 24 | CJS; works with current Jest Babel allowlist |
| `got@15.1.0` | Node `>=20`, ESM only | Incompatible with current CJS entry without dynamic import / package rewrite |
| `jsdom@26.1.0` | Node `>=18` | Current pin |
| `jsdom@29.1.1` | Node `^20.19 \|\| ^22.13 \|\| >=24` | Fits engines; optional peer `canvas` unused here |
| `jest@30.4.2` | Node `^18.14 \|\| ^20 \|\| ^22 \|\| >=24` | Fits; keep `babel-jest` aligned on 30.x |
| pnpm `10.31`–`10.34` | Node 24 + Corepack | Stay on 10.x with existing lockfileVersion 9 |
| Devbox Node `24.12.0` | `engines.node >=24.12` | Optional bump to `24.18.x` LTS |

## Modular refactor (stack implication)

Refactor is **file/module boundaries**, not new packages:

```text
index.js          → bin entry; start poller only when require.main === module
lib/scrape.js     → got + jsdom → BuildState[]
lib/status.js     → normalize aria-label → enum
lib/tracker.js    → Map of in-flight builds + diff/announce decisions
lib/announce.js   → stderr colors + execFile('say')
```

No bundler, no TypeScript, no DI framework.

## Sources

- npm registry (`npm view`) — versions: got `15.1.0` / `11.8.6`, jsdom `29.1.1` / `26.1.0`, jest `30.4.2`, cheerio `1.2.0`, pnpm `10.34.5` / `11.17.0`, `@octokit/rest` `22.0.1` — **registry-verified 2026-07-24**
- [got npm / README](https://www.npmjs.com/package/got) — ESM-only warning; v11 unmaintained — Context7 `/sindresorhus/got` + npm (MEDIUM–HIGH)
- [sindresorhus/got#1789](https://github.com/sindresorhus/got/issues/1789) — stay on v11 for CommonJS
- Context7 `/jsdom/jsdom` — `JSDOM` + `querySelector` usage (MEDIUM via classify-confidence)
- Context7 `/websites/jestjs_io_30_0` — Jest 30 CJS mocks + `transformIgnorePatterns` (MEDIUM)
- Context7 `/websites/nodejs_latest-v24_x_api` — `execFile` vs `exec`, shell-injection guidance (MEDIUM; Node official docs)
- [GitHub Docs — workflow runs](https://docs.github.com/en/rest/actions/workflow-runs) — public unauthenticated list for public repos (verified via docs fetch; do not adopt this milestone)
- nodejs.org dist index — Node `v24.18.0` LTS Krypton (2026-06-23)
- Project files: `package.json`, `index.js`, `.planning/PROJECT.md`, `.planning/codebase/STACK.md`

### Confidence notes

| Claim area | Level | Why |
|------------|-------|-----|
| Exact package versions | HIGH | Direct `npm view` + nodejs.org on research date |
| Keep `got@11` / defer ESM | HIGH | Official got docs + project CJS constraint |
| Prefer `execFile` for `say` | HIGH | Node 24 child_process docs |
| Keep HTML scrape vs API | HIGH | Project decision; API existence verified but out of scope |
| cheerio vs jsdom tradeoff | MEDIUM | Community consensus; not required to change |
| Optional jsdom 29 bump safety | MEDIUM | Engines OK; needs test/fixture validation at bump time |

---
*Stack research for: github_action_sound (concurrent builds milestone)*  
*Researched: 2026-07-24*
