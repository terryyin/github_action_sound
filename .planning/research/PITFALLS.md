# Pitfalls Research

**Domain:** Concurrent GitHub Actions build monitoring via public HTML scrape + macOS `say` announce (brownfield single-build → multi-build CLI)
**Researched:** 2026-07-24
**Confidence:** HIGH (codebase-verified failure modes); MEDIUM (ecosystem patterns for scrape monitors / async poll races)

## Critical Pitfalls

### Pitfall 1: Treating DOM order as “the current build”

**What goes wrong:**
`querySelector("[id^='check_suite_']")` returns only the first matching row. When multiple workflows run, later rows’ queued → running → terminal transitions are never seen. Extending naively to `querySelectorAll` but still keying tracker state off “newest DOM position” reintroduces the same bug whenever GitHub reorders rows (filters, socket updates, pagination).

**Why it happens:**
Single-build scrapers assume the Actions page is a stack with “top = active.” Concurrent runs invalidate that. Developers keep positional identity (`first row`, `index 0`) instead of stable suite/run ids.

**How to avoid:**
- Scrape **all** `check_suite_*` rows each tick into a map keyed by suite/run id (or commit/title if that remains the product identity — but keep DOM id as scrape key for matching across ticks).
- Diff **per identity**, not against a single `lastBuildState`.
- Never infer “active” solely from DOM order; use status (queued/running vs terminal).

**Warning signs:**
- Unit tests only ever feed one HTML row.
- Tracker stores one `BuildState` instead of `Map<id, BuildState>`.
- Manual test with two simultaneous workflows: only one announcement path fires.

**Phase to address:**
**Reliability** (multi-build tracking) — must land before cleanup.

---

### Pitfall 2: Status string vocabulary mismatch (scrape vs color vs speech vs tests)

**What goes wrong:**
Live SVG `aria-label` values look like `completed successfully` / `currently running`. `colorCode()` and queued-suppression compare against `'completed successfully: '` / `'queued: '` (trailing `: `). Tests construct dotted phrases (`'completed successfully.'`). Result: colors never apply, queued filtering is wrong, and tests pass while production speech/color paths are broken.

**Why it happens:**
Three layers invent their own status literals instead of normalizing once at scrape time. Synthetic test statuses drift from fixtures and from GitHub.

**How to avoid:**
- Map `aria-label` → internal enum (`queued` | `running` | `success` | `failure` | `unknown`) **in the scraper only**.
- Drive `colorCode`, dictionaries, and `diffToSentence` from that enum only.
- Tests must assert against **fixture aria-labels** and the enum — never hand-invent status strings that don’t appear in HTML.

**Warning signs:**
- `colorCode()` returns `undefined` in tests that “succeed.”
- Grep shows status literals with `: `, `.`, and bare phrases coexisting.
- Fixture has `aria-label="completed successfully"` but tests use `'completed successfully.'`.

**Phase to address:**
**Reliability** (status normalization) — same phase as multi-build; blockers for correct announcements.

---

### Pitfall 3: Passing `undefined` scrape results into the update path

**What goes wrong:**
`buildState` catches errors, logs, and returns `undefined`. The poll tick still calls `mostRecentUpdate(newState)`, which reads `newState.buildName` and throws. One bad tick (network blip, login wall HTML, missing selector) turns into an unhandled rejection / crashed tick; interval keeps firing and may keep throwing.

**Why it happens:**
Error handling stops at “log and swallow” without a Result/null guard at the call site. Multi-build scrapes amplify this: one null child node on any row can abort the whole parse if not guarded per-row.

**How to avoid:**
- Treat scrape failure as a no-op tick: if `!newState` / empty map, return early — **do not** mutate tracker state.
- Per-row: skip malformed rows; don’t fail the whole page on one bad suite.
- Detect challenge/empty HTML (no `check_suite_*`) as transient failure, not “all builds vanished.”

**Warning signs:**
- Catch block with no `return` typed result and no caller guard.
- No tests for `got` rejection, empty body, or missing `svg` / `Link--primary`.
- After GitHub hiccup, process logs TypeErrors every 5s.

**Phase to address:**
**Reliability** (scrape-failure crash fix) — explicit Active requirement.

---

### Pitfall 4: Shell injection / broken speech via `exec('say "' + sentence + '"')`

**What goes wrong:**
Commit titles / run names with `"`, `` ` ``, `$()`, or newlines break the shell command or execute arbitrary shell. Node docs: never pass unsanitized input to `child_process.exec`.

**Why it happens:**
TTS is treated as “just print text” while implementation goes through a shell. Scraped HTML is untrusted relative to the shell.

**How to avoid:**
- Use `execFile('say', [sentence])` (argv array, no shell).
- Truncate/sanitize announcement text for length; strip control chars.
- Unit-test titles containing quotes and `$()`.

**Warning signs:**
- String concatenation into `exec(...)`.
- `say` not mocked; no escaping tests.
- Announcements that stop mid-title when a commit message has a quote.

**Phase to address:**
**Reliability** if needed for safe multi-build announce; otherwise **Cleanup** (explicit tech-debt item). Prefer fixing in reliability if titles are announced with multi-build.

---

### Pitfall 5: Tracking finished rows forever (`previousBuildNames` / ignore-forever)

**What goes wrong:**
Current `MostRecentUpdate` pushes every prior `buildName` into `previousBuildNames` and forever suppresses reappearance. That “fixes” DOM flicker for a single top row but breaks legitimate re-runs of the same suite id patterns, grows unbounded memory, and fights the desired model: **track in-flight only → announce terminal → drop**.

**Why it happens:**
Dedup-by-forever-blacklist is easier than an explicit in-flight set with lifecycle. Multi-build ports often copy the blacklist pattern to “N builds.”

**How to avoid:**
- Active set = only queued/running identities.
- On first observation of terminal status for a tracked id: announce once, then **delete** from active set.
- Do not permanently blacklist ids; optional short TTL “recently announced terminal” set is enough to suppress duplicate terminal spam within a few polls.
- Bound any history (LRU / max size).

**Warning signs:**
- Array/Set that only `push`/`add`, never prune on terminal.
- Requirement says “stop tracking after finish” but code still has `previousBuildNames.includes`.
- Long-running monitor RSS creeps upward.

**Phase to address:**
**Reliability** (multi-build lifecycle) — core of the milestone.

---

### Pitfall 6: Race between overlapping polls, announcements, and state updates

**What goes wrong:**
`setInterval(actionSoundJob, 5000)` fires even if the previous `got` + JSDOM + diff hasn’t finished. Overlapping ticks race on shared tracker state: older scrape can overwrite newer, duplicate announcements fire, or terminal drop races with a stale “still running” snapshot. Fire-and-forget `say` plus immediate state mutation makes “overlapping speech OK” easy to confuse with “overlapping state mutation OK” — speech may overlap; **state updates must be single-flight**.

**Why it happens:**
Async interval anti-pattern; shared mutable closure without a mutex. Multi-build diffs make races more damaging (many keys updated per tick).

**How to avoid:**
- Recursive `setTimeout` after tick completion, or a `running` flag that skips/queues the next poll.
- Apply scrape → compute announcements → **commit state atomically**, then fire `say` (speech can be async after commit).
- Don’t let a late tick mutate state after a newer tick has committed.

**Warning signs:**
- `setInterval` wrapping an async/`Promise.then` job with no in-flight guard.
- Flaky tests when fake timers + delayed `got` mocks overlap.
- Duplicate “new build” lines under slow network.

**Phase to address:**
**Reliability** (correct multi-build diffs); reinforce in **Cleanup** if poller module is extracted.

---

### Pitfall 7: Test fixtures that don’t match live `aria-label`s (false confidence)

**What goes wrong:**
Fixture is a 2023-era single successful suite; tests for status transitions use invented dotted strings. Suite passes while live colors, queued gating, and multi-row scraping remain wrong. Classic “looks done” trap for scraper CLIs.

**Why it happens:**
DOM contract isn’t owned by GitHub’s API; fixtures rot; tests optimize for the domain class API instead of the scrape contract.

**How to avoid:**
- Fixtures for: queued, running, success, failure, **multiple concurrent rows**, missing nodes, empty page.
- Golden assertions: scraped `aria-label` → enum → sentence/color.
- Periodically refresh HTML from a public Actions page (canary) when selectors break.
- Never assert `colorCode: undefined` as expected success unless documenting a known bug (don’t).

**Warning signs:**
- One HTML fixture; no `querySelectorAll` tests.
- Status strings in tests differ from fixture `aria-label`.
- CONCERNS already documents mismatch and tests still encode the wrong literals.

**Phase to address:**
**Reliability** (tests that lock correct behavior); **Cleanup** can add fixture refresh / module seams for easier testing.

---

### Pitfall 8: Identity collision when keying only on commit/title

**What goes wrong:**
Product decision: identify by commit/title. Two workflows with the same title (or empty/truncated title) collapse into one tracker entry → missed announcements or crossed status. DOM suite ids are unique; titles are not.

**Why it happens:**
Announcement UX wants human titles; implementers reuse the display string as the map key.

**How to avoid:**
- Internal key = `check_suite_*` id (or run id from `data-url`).
- Display/announce with title/commit text.
- If product insists on title identity, document collision behavior and disambiguate with workflow name when titles collide.

**Warning signs:**
- Map keyed by `gitLog` alone.
- Two “CI” titled workflows on one page; only one speaks.

**Phase to address:**
**Reliability** (multi-build identity design).

---

### Pitfall 9: Interpreting “rows disappeared” as mass completion

**What goes wrong:**
Pagination, filters, rate-limit interstitial, or partial DOM means in-flight rows vanish for one tick. Naive sync deletes them or announces failure/success incorrectly — or, conversely, never drops finished rows still visible as historical green/red.

**Why it happens:**
Equating “not in this scrape” with “build ended” without distinguishing terminal status vs scrape incompleteness.

**How to avoid:**
- Drop only after observing a **terminal** status while tracked, or after N consecutive absences **and** last known was terminal.
- On zero suites / challenge page: keep previous active set, log transient error, don’t announce.
- Prefer status-driven lifecycle over presence-only lifecycle.

**Warning signs:**
- Code deletes map entries solely because id ∉ this scrape.
- No challenge/empty-page detection.

**Phase to address:**
**Reliability** (lifecycle rules); edge cases may need a follow-up if flaky in the wild.

---

### Pitfall 10: Import side effect starts the poller (multi-build makes it worse)

**What goes wrong:**
`require('../index.js')` starts `setInterval` and hits the network. Tests clear the timer in `afterAll`. Extracting modules without guarding `require.main === module` causes accidental multi-build polling from any import.

**Why it happens:**
CLI and library share one file; side effects at load time.

**How to avoid:**
- Start poller only under `require.main === module` or a separate `cli.js` bin.
- Tests import pure modules with no timers.

**Warning signs:**
- Exported `timer` cleared in tests.
- Accidental `say`/network during `require`.

**Phase to address:**
**Cleanup** (module split) — don’t block multi-build correctness, but do before wider refactor lands.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single `lastBuildState` + forever blacklist | Simple dedup for one row | Misses concurrent builds; leaks; blocks re-runs | Never for this milestone’s goal |
| Status literals copied into color/dict/tests | Fast to type | Permanent false confidence | Never — normalize once |
| `exec('say "…"')` | One-liner TTS | Shell injection | Never |
| `setInterval` + async scrape | Easy poll loop | Overlapping ticks / state races | Only with in-flight guard; prefer `setTimeout` chain |
| Keep monolith until “after multi-build” | Faster reliability ship | Harder tests | Acceptable **short-term** if reliability lands first (project decision) |
| HTML scrape vs Actions API | No auth | Fragile DOM; rate limits | Acceptable for this milestone (scope); document public-only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Actions HTML | Assume first `check_suite_*` is “the” build | Enumerate all suites; key by id; status-driven lifecycle |
| SVG `aria-label` | Hardcode guessed phrases with `: ` / `.` | Normalize live labels; fixture-lock them |
| macOS `say` | Shell-interpolate scraped titles | `execFile('say', [text])` |
| `got` + jsdom | Treat any HTML as Actions UI | Validate selectors; detect empty/challenge; don’t update state |
| Jest + `index.js` | Import starts poller | Separate CLI entry; no load-time interval |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Overlapping 5s polls | Duplicate announces; CPU spikes | Single-flight poll | Slow GitHub / large HTML |
| Full JSDOM every tick × N rows | Latency grows with page size | Still OK at page scale; avoid nested full reparse | Very large Actions histories |
| Unbounded id history | Memory creep on long runs | In-flight set + bounded recent-terminal LRU | Days-long monitor process |
| Unauthenticated 12 req/min | Empty/login HTML → scrape failures | Backoff on 403/429; don’t crash | Multiple CLI instances / aggressive interval |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `exec` with scraped title | Arbitrary shell via commit message | `execFile` argv only |
| Fetch any argv URL | SSRF-ish local abuse / surprise hosts | Allowlist `https://github.com/.../actions` |
| Assuming public HTML is “trusted” | Injection into shell/logs | Treat scrape text as untrusted data |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Only top build speaks | Missed failures while another workflow runs | Announce each in-flight build’s transitions |
| Silent color failure | Hard to scan stderr | Enum-driven colors |
| Crash on scrape blip | Monitor “dies” until restart | No-op + log; keep tracking |
| Overlapping `say` without labeled titles | Can’t tell which build spoke | Include title/commit in every sentence (already style); accept overlap per product decision |
| Forever mute after first sight | Re-run of same suite never announces | Drop after terminal; don’t blacklist forever |

## "Looks Done But Isn't" Checklist

- [ ] **Multi-row scrape:** Fixture with ≥2 concurrent suites; both transition paths announce.
- [ ] **Lifecycle:** Tracked → terminal announce → removed from active set; not forever-blacklisted.
- [ ] **Status enum:** Live `aria-label` → colors + speech; no `: `/`.` literal forks.
- [ ] **Scrape failure:** `got` reject / missing node → no throw; state unchanged.
- [ ] **`say` safety:** Title with `"` and `$(reboot)` cannot alter shell; uses `execFile`.
- [ ] **Poll single-flight:** Delayed scrape cannot reorder commits of tracker state.
- [ ] **Tests match production labels:** No synthetic status strings absent from fixtures.
- [ ] **Identity:** Suite/run id for map key; title for speech only (or documented collision rules).
- [ ] **Empty/challenge page:** Does not clear all in-flight builds.
- [ ] **Import safety:** Requiring library code does not start polling (cleanup phase OK if deferred).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| DOM order / first-row only | MEDIUM | Switch to multi-row map; add concurrent fixture; delete single-state tracker |
| Status vocabulary mismatch | LOW–MEDIUM | One normalize map; fix color/dict/tests in one PR |
| Undefined scrape crash | LOW | Guard call site; add error-path tests |
| Shell `say` | LOW | Replace with `execFile`; add quote tests |
| Forever blacklist | MEDIUM | Replace with in-flight set + terminal drop; migrate tests off `previousBuildNames` |
| Overlapping poll race | MEDIUM | Mutex or recursive timeout; reorder announce-after-commit |
| Stale fixtures | MEDIUM | Recapture HTML; expand status matrix; optional canary workflow |
| Title identity collisions | MEDIUM | Key by suite id; keep title in sentences |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| DOM order / first-row only | **Reliability** — multi-build tracking | Two-row fixture: both finish announced |
| Status string mismatch | **Reliability** — status normalization | Live aria-labels produce defined colors + expected sentences |
| Undefined scrape crash | **Reliability** — crash fix | Rejection/missing-node tests; no throw |
| Shell injection in `say` | **Reliability** (preferred) or **Cleanup** | `execFile`; malicious title test |
| Tracking finished forever | **Reliability** — in-flight lifecycle | After terminal, id absent from active set; re-run can track again |
| Overlapping poll / state race | **Reliability**; harden in **Cleanup** poller extract | In-flight guard; delayed mock cannot stale-overwrite |
| Fixture ≠ live aria-labels | **Reliability** tests | Fixture labels == production path inputs |
| Title-only identity collision | **Reliability** | Two same-title suites remain distinct internally |
| Rows vanished ≠ completed | **Reliability** | Empty scrape keeps prior in-flight |
| Import starts poller | **Cleanup** — module/CLI split | `require(lib)` starts no timer |

**Phase ordering rationale:** Reliability first (multi-build + crash + status + lifecycle + races) so behavior is correct; Cleanup second (monolith split, `execFile` if deferred, import guard, dead Japanese dict) so structure doesn’t mask remaining bugs — but do not “refactor” the single-state tracker before the multi-build model exists.

## Sources

- First-party codebase: `index.js` (`querySelector` first suite, `previousBuildNames`, `exec('say "'+…')`, undefined `buildState` return, `setInterval` poll), `__tests__/sound-monitor.spec.js` (dotted statuses vs fixture `completed successfully`), `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md` (in-flight-only, overlapping `say` OK).
- Node.js child_process docs (v24): never pass unsanitized input to `exec`; prefer `execFile` without a shell — https://nodejs.org/docs/latest-v24.x/api/child_process.html [confidence: MEDIUM, Context7 + official docs verified]
- Ecosystem: HTML scrapers break on DOM/selector change; validate selectors and refresh fixtures — DEV/community scrape-monitor guidance [confidence: MEDIUM]
- Ecosystem: `setInterval` + async overlaps — recursive `setTimeout` / mutex pattern [confidence: MEDIUM]
- Multi-build forever-blacklist vs in-flight lifecycle — primarily project requirement + CONCERNS; external CI dashboards reinforce status-driven state [confidence: HIGH for this repo; LOW–MEDIUM as general literature]

---
*Pitfalls research for: Concurrent GitHub Actions HTML scrape + speech announce*
*Researched: 2026-07-24*
