# Codebase Concerns

**Analysis Date:** 2026-07-24

## Tech Debt

**Single-file monolith with mixed responsibilities:**
- Issue: Scraping, domain model, i18n dictionaries, CLI wiring, polling loop, and ANSI styling all live in one module with no separation.
- Files: `index.js`
- Impact: Any change (status parsing, speech, CLI args) risks breaking unrelated behavior; hard to unit-test without importing the live poller.
- Fix approach: Split into modules (e.g. `build-state.js`, `dictionaries.js`, `say.js`, `cli.js`) and keep the poller out of the library entry used by tests.

**Dead / unused Japanese dictionary:**
- Issue: `japaneseDictionary` is defined and exported nowhere into the runtime path; announcements always use `englishDictionary`.
- Files: `index.js` (lines ~121–134, ~147)
- Impact: Japanese support looks present but never runs; keys also do not match live GitHub `aria-label` values.
- Fix approach: Wire a CLI/locale flag to select the dictionary, or remove unused code until localization is real.

**Status vocabulary is inconsistent across layers:**
- Issue: Three incompatible status string formats coexist:
  - Live scrape: SVG `aria-label` values like `completed successfully` (see fixture in `__tests__/sound-monitor.spec.js`).
  - `BuildState.colorCode()` map keys: `'queued: '`, `'currently running: '`, `'completed successfully: '`, `'failed: '`.
  - `japaneseDictionary` keys: `'has been queued.'`, `'is currently running.'`, `'completed successfully.'`, `'failed.'`.
  - Unit tests construct states with dotted phrases (`'completed successfully.'`) that match neither scrape nor `colorCode` keys.
- Files: `index.js`, `__tests__/sound-monitor.spec.js`
- Impact: Terminal colors never apply for real scraped statuses (`colorCode()` returns `undefined`). Localization cannot work. Tests give false confidence about production speech/color behavior.
- Fix approach: Normalize statuses to a single enum (or map from `aria-label` once at scrape time) and assert colors/speech against that enum in tests.

**Import side effect starts the poller:**
- Issue: Loading `index.js` immediately reads `process.argv`, creates `mostRecentUpdate`, and starts `setInterval(..., 5000)`. Tests must `clearInterval(timer)` in `afterAll`.
- Files: `index.js` (lines ~136–169), `__tests__/sound-monitor.spec.js` (lines ~125–128)
- Impact: Any `require('../index.js')` starts network polling; accidental imports (REPL, other tools) spam GitHub and `say`.
- Fix approach: Guard with `require.main === module` (or separate `cli.js` bin entry) so library exports do not start the timer.

**No input validation for CLI URL:**
- Issue: Last argv token is treated as the Actions URL with no check for missing args, non-URL strings, or wrong path shape.
- Files: `index.js` (`githubActionURL = process.argv[process.argv.length - 1]`)
- Impact: Running without args polls whatever the last argv fragment is (possibly the script path); failures only surface as scrape errors every 5s.
- Fix approach: Validate a GitHub Actions URL, print usage, and exit non-zero when invalid.

**No lint / format / type tooling in the quality gate:**
- Issue: `package.json` has `lint:deps` (syncpack) but no ESLint/Prettier; CI runs only `pnpm test`.
- Files: `package.json`, `.github/workflows/ci.yml`
- Impact: Style and dependency-policy drift go unnoticed; `lint:deps` is never enforced in CI.
- Fix approach: Add syncpack (and optional ESLint) to the CI job; keep rules minimal for this CJS CLI.

**Ad-hoc helper scripts outside the package:**
- Issue: `who.sh` hardcodes `~/Downloads/who.mp3` and pipes `pnpm sound` for a local alert hack; not documented in README as a supported interface.
- Files: `who.sh`, `README.md`
- Impact: Breaks on other machines; couples demo behavior to a personal filesystem path.
- Fix approach: Document as personal/local-only, or parameterize the sound path and keep it out of the published package surface.

## Known Bugs

**Unhandled scrape failure crashes the poll tick:**
- Symptoms: When `buildState` catches an error it logs and returns `undefined`; the `.then` handler still calls `mostRecentUpdate(newState)`, which reads `newState.buildName` and throws.
- Files: `index.js` (`buildState` catch ~72–74; `actionSoundJob` ~160–167)
- Trigger: Network error, non-HTML response, or DOM selector miss (null `querySelector` result before `.id` / `.getAttribute`).
- Workaround: None in-process; interval keeps firing and may keep throwing.

**Shell injection / broken speech via unescaped `say` argument:**
- Symptoms: Commit messages or titles containing `"` break the shell command or inject extra shell syntax; `exec('say "' + sentence + '"', ...)`.
- Files: `index.js` (`say` ~51–61)
- Trigger: Git log / title text with quotes, backticks, `$()`, or newlines scraped into the announcement sentence.
- Workaround: Avoid announcing titles with special characters; use `execFile('say', [sentence])` instead of string concatenation.

**Color codes never match live statuses:**
- Symptoms: Console announcements lack intended background/foreground styling even when status changes are announced.
- Files: `index.js` (`colorCode` ~100–107 vs scrape ~69)
- Trigger: Any successful scrape using real GitHub `aria-label` text (no trailing `: `).
- Workaround: None.

**`diffToSentence` queued exclusion uses wrong literal:**
- Symptoms: Comparison `this.status !== 'queued: '` does not match scraped labels (e.g. queued-related aria-labels without that exact suffix), so queued transitions may announce incorrectly relative to intent.
- Files: `index.js` (~92)
- Trigger: Status transitions involving queued states under real HTML labels.
- Workaround: None until status normalization exists.

## Security Considerations

**Command injection through TTS path:**
- Risk: Scraped text is interpolated into a shell string executed via `child_process.exec`. A malicious or odd commit title on a monitored public repo could run arbitrary shell via `say "..."`.
- Files: `index.js` (`say`)
- Current mitigation: None (assumes benign commit messages).
- Recommendations: Use `execFile`/`spawn` with argv array; never pass user/scraped content through a shell. Sanitize or truncate announcement text.

**Unauthenticated HTML scrape of GitHub UI:**
- Risk: No auth headers/cookies; private repos fail silently. Public pages may be rate-limited, bot-challenged, or shaped differently when logged out. Tool cannot safely attach tokens without clear secret handling.
- Files: `index.js` (`buildState` via `got(url)`), `README.md`
- Current mitigation: Intended for public Actions pages only (undocumented constraint).
- Recommendations: Prefer GitHub Actions REST/GraphQL API with a fine-scoped token from env (e.g. `GITHUB_TOKEN`); never commit tokens; document public-only HTML mode if kept.

**No URL allowlist:**
- Risk: User can point the poller at any URL; `got` fetches and `jsdom` parses arbitrary HTML every 5 seconds.
- Files: `index.js`
- Current mitigation: Operator-supplied argv only (local CLI trust model).
- Recommendations: Restrict to `https://github.com/.../actions` hosts/paths before fetching.

## Performance Bottlenecks

**Fixed 5s polling with no in-flight guard:**
- Problem: `setInterval(actionSoundJob, 5000)` fires regardless of whether the previous `got` + `JSDOM` parse finished.
- Files: `index.js` (~160–169)
- Cause: Fire-and-forget async job inside interval; slow network or large HTML piles up concurrent parses.
- Improvement path: Use recursive `setTimeout` after completion, or a mutex/`running` flag; increase interval or switch to GitHub API webhook/polling with ETag.

**Full-page HTML parse every tick:**
- Problem: Each poll downloads the Actions page and builds a JSDOM document for a few selectors.
- Files: `index.js` (`buildState`), dependency `jsdom@26.1.0`
- Cause: UI scraping instead of a lightweight API response.
- Improvement path: GitHub Checks/Actions API JSON; keep HTML scrape only as fallback.

**Unbounded `previousBuildNames` array:**
- Problem: Every seen build id is pushed and never pruned.
- Files: `index.js` (`MostRecentUpdate` ~138–155)
- Cause: Dedup history grows for long-running monitors.
- Improvement path: Keep a bounded Set/LRU (e.g. last N build ids) or clear entries older than a threshold.

## Fragile Areas

**GitHub Actions HTML DOM contract:**
- Files: `index.js` (`querySelector("[id^='check_suite_']")`, `svg[aria-label]`, `span.Link--primary`), `__tests__/sound-monitor.spec.js` (2023-era HTML fixture)
- Why fragile: Relies on undocumented GitHub web markup and class names. UI redesigns break scraping without a failing contract at GitHub’s API layer.
- Safe modification: Update fixture from a fresh page capture and add integration tests against multiple status aria-labels; prefer API migration.
- Test coverage: Only one successful HTML shape (`completed successfully`); no fixtures for running/failed/queued or missing nodes.

**macOS `say` dependency:**
- Files: `index.js` (`say`), `README.md`
- Why fragile: Non-macOS environments error on every announcement; CI cannot exercise speech.
- Safe modification: Feature-detect `say`, no-op or use a pluggable notifier; keep speech behind an interface for tests.
- Test coverage: `say` is not unit-tested (would shell out).

**Jest transformIgnorePatterns for ESM-ish deps:**
- Files: `jest.config.js`, `babel.config.js`
- Why fragile: Complex pnpm path regex allowlist for transforming transitive packages; dependency upgrades can break the test runner in opaque ways.
- Safe modification: When upgrading `got`/`jsdom`, re-verify Jest transforms; consider staying on CJS-compatible clients or migrating tests to a runner with better ESM support.
- Test coverage: Config itself is untested; breakage appears as Jest transform errors.

## Scaling Limits

**Single URL, single process:**
- Current capacity: One Actions URL per process; one global interval and one `MostRecentUpdate` closure.
- Limit: Monitoring multiple repos/workflows requires multiple processes; no multi-URL config.
- Scaling path: Accept multiple URLs or a config file; share a scheduler; use API pagination/filtering per workflow.

**GitHub rate / bot detection:**
- Current capacity: One request every ~5s per process (~12 req/min) unauthenticated.
- Limit: Aggressive polling or many instances can hit soft blocks, CAPTCHA, or empty/login HTML, which currently surfaces as scrape failures then tick crashes.
- Scaling path: Back off on HTTP 429/403; use authenticated API with higher quotas; exponential backoff on parse failures.

## Dependencies at Risk

**`got@11.8.6`:**
- Risk: Major line behind current `got` (v12+ is ESM-first); 11.x is maintenance-mode relative to modern Node 24 tooling. Still locked deliberately for CJS.
- Impact: Security/fix backports may lag; future Node/engine bumps may force a painful ESM migration together with Jest transforms.
- Migration plan: Plan ESM migration (`got` 14+) or replace with Node built-in `fetch` to drop the dependency.

**`jsdom@26.1.0`:**
- Risk: Heavy dependency for selecting three DOM nodes; version churn and transitive packages drive the Jest transform allowlist.
- Impact: Install size and test config complexity; HTML parsing cost every poll.
- Migration plan: Replace scrape with GitHub API; if HTML must stay, prefer a lighter parser (e.g. `linkedom` / `cheerio`) with stable selectors.

**Engines pin `node >= 24.12` / `pnpm >= 10.31`:**
- Risk: Narrow engine floor vs typical consumer Node LTS ranges; fine for this author’s setup, surprising for npm consumers.
- Impact: Install warnings/failures on older Node; shrinks adopter base.
- Migration plan: Document clearly in README; or relax engines if the code does not need 24-only APIs.

## Missing Critical Features

**No GitHub API / auth mode:**
- Problem: Cannot monitor private Actions; brittle public HTML only.
- Blocks: Private CI monitoring, stable status fields, workflow filtering by name/id.

**No graceful shutdown or run-once mode:**
- Problem: Only continuous polling; Ctrl+C leaves interval/speech children unmanaged beyond default process exit.
- Blocks: Scripted “announce current status once” UX and clean test/process lifecycle without exporting `timer`.

**No cross-platform notification:**
- Problem: macOS `say` only.
- Blocks: Linux/Windows users and headless CI usage as a notifier.

**No structured logging / verbosity control:**
- Problem: Mixed `console.error` for normal announcements and real errors; ANSI blink codes always on.
- Blocks: Piping to other tools (see `who.sh` string match on `"failed"`) without ANSI/noise issues.

## Test Coverage Gaps

**Error and null-DOM paths in `buildState`:**
- What's not tested: Network rejection, empty body, missing `check_suite_*` node, missing `svg` / `Link--primary`, resulting `undefined` handling in `actionSoundJob`.
- Files: `index.js`, `__tests__/sound-monitor.spec.js`
- Risk: Production poll crashes on transient GitHub/HTML changes go unnoticed.
- Priority: High

**`say` / `exec` behavior:**
- What's not tested: Shell escaping, `say` failure on non-macOS, empty sentence early-return interaction with colors.
- Files: `index.js`
- Risk: Command injection and platform failures ship without detection.
- Priority: High

**Status/color/dictionary alignment:**
- What's not tested: Real aria-label strings through `colorCode()` and end-to-end scrape → announce for running/failed/queued.
- Files: `index.js`, `__tests__/sound-monitor.spec.js`
- Risk: Colors and Japanese path remain broken while unit tests pass on synthetic dotted statuses.
- Priority: High

**CLI / argv / module entry:**
- What's not tested: Missing URL, wrong URL, `require.main` vs import side effects.
- Files: `index.js`
- Risk: Broken UX and accidental polling on import.
- Priority: Medium

**CI does not run dependency lint:**
- What's not tested: `pnpm lint:deps` (syncpack) in `.github/workflows/ci.yml`.
- Files: `package.json`, `.github/workflows/ci.yml`
- Risk: Dependency version policy drift.
- Priority: Low

---

*Concerns audit: 2026-07-24*
