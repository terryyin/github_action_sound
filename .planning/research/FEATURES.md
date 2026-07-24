# Feature Research

**Domain:** GitHub Actions CI status monitor / build announcer (macOS CLI, poll + scrape + `say`)
**Researched:** 2026-07-24
**Confidence:** MEDIUM

## Feature Landscape

Scope is a **side-monitor announcer**, not a CI dashboard. Ecosystem peers split into: single-run watchers (`gh run watch` + chained notify), multi-run TUIs (gitwatch, gh-hud, actiontui, gh-hound), and TTS/notify layers (agent-notify). Table stakes below are what users expect from a tool that watches Actions and speaks status; differentiators are what make *this* tool correct under concurrent builds without becoming a TUI product.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or “wrong” for a concurrent-builds fix.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Poll Actions URL on an interval | Core loop of existing CLI; `gh run watch` / gh-hud also poll (~3–5s) | LOW | Already present; keep interval model (no WebSockets this milestone) |
| Scrape / observe check-suite status | Tool’s delivery model is public HTML scrape | MEDIUM | Must select **all** in-flight suites, not first `querySelector` row |
| Track **all in-flight** builds (queued/running) | Concurrent workflows are normal; watching only newest row silently drops siblings — the bug this milestone fixes | MEDIUM | Core value; map of tracked builds by id |
| Announce status **transitions** (not every poll) | Duplicate speech every 5s is unusable | LOW | Diff last-known status per build |
| Announce terminal outcomes (success / failure) | Primary reason people leave monitors running | LOW | Include cancel/skip only if scraped labels expose them consistently |
| Identify which build changed (commit / title) | With multiple in flight, “the build failed” is ambiguous | LOW | PROJECT decision: identity = scraped commit/title style |
| Suppress duplicate / stale announcements for a tracked build | Existing single-build behavior; still required per-id | LOW | Per-build last status + drop after terminal |
| **In-flight only**: start tracking when queued/running; announce finish; then **drop** | Historical rows on Actions page would re-announce forever | MEDIUM | Aligns with gh-hud `filterStatus: in_progress, queued` + short completed window; we drop immediately after terminal announce |
| Colored stderr + macOS `say` on change | Current product contract | LOW | Fix status→color/speech normalization so live `aria-label`s work |
| Survive scrape / network failures without crashing the poll tick | Transient GitHub HTML/network errors are routine | LOW | Existing bug: `undefined` state into update path |
| Fire announcements when **multiple** builds change in one poll | Concurrent finishes must not coalesce to one event | LOW | PROJECT: overlapping `say` OK — no speech queue required for v1 |

### Differentiators (Competitive Advantage)

Valuable for *this* product’s niche (hands-free speech side-monitor). Not required to “exist” as a category, but valued vs `gh run watch` (single run) and vs TUI dashboards (eyes-on).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Concurrent multi-build speech without a TUI | Eyes-off: hear every in-flight finish while coding; `gh run watch` forces one run or N parallel processes | MEDIUM | Primary differentiator for this milestone |
| Overlapping `say` (no speech queue) | Lowest latency / simplest concurrency; acceptable garble when two finish together | LOW | Contrast: agent-notify uses a sequential TTS queue — we deliberately skip that |
| Public HTML scrape, no auth token | Zero setup for public repos; matches current CLI | LOW | Fragile DOM; keep as milestone constraint |
| Commit/title spoken in announcements | Distinguishes concurrent builds without workflow-name UX | LOW | Stick to current sentence style |
| Status string normalization from live `aria-label` | Makes colors + speech trustworthy on real pages | MEDIUM | Fixes vocabulary mismatch (table-stakes reliability, differentiator vs broken colors today) |
| Immediate multi-change announce in one tick | No “newest wins” coalescing | LOW | Per-id emit loop after snapshot diff |

### Anti-Features (Commonly Requested, Often Problematic)

Features that look good in competitor TUIs / notify stacks but conflict with PROJECT.md scope or add rewrite risk.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full TUI / grid dashboard (gh-hud, gitwatch, actiontui) | Glanceable multi-run UI | Different product; large surface; pulls focus from reliability | Stay CLI poll + stderr + `say` |
| Multi-repo / org monitoring | Power users run many repos | Config, rate limits, auth pressure; out of scope | One Actions URL per process (existing) |
| GitHub API / token auth / private repos | Stable fields, private CI | Auth UX, secret handling, scope creep this milestone | Keep public HTML scrape |
| Workflow / branch filters beyond watched page | Reduce noise | Needs richer metadata than scrape identity; PROJECT out of scope | Point URL at already-filtered Actions view if needed |
| Real-time WebSockets / webhook server | Lower latency | Ops complexity; breaks simple CLI model | Poll interval remains |
| Non-macOS speech backends | Portability | Not this milestone; `say` is the contract | macOS `say` only |
| Sequential speech queue / “don’t overlap” | Clearer audio | Extra state machine; PROJECT explicitly allows overlap | Fire-and-forget `say` |
| Re-run / cancel / open-in-browser from tool | TUI convenience | Mutation + auth + UX; not an announcer | Use `gh` / browser |
| ETA / history dots / stats charts | Dashboard polish | Unrelated to announce correctness | Defer indefinitely |
| Desktop Notification Center / distinct system sounds | Richer alerts | Extra platform APIs; stderr+`say` already present | Keep `say` + colored stderr |
| Japanese (or multi-locale) product wiring | Unused dictionary exists | Keys don’t match live labels; PROJECT: not v1 | Remove or defer unused dictionary |
| Config files / redesign CLI UX | “Proper” tool feel | Blocks reliability-first phasing | Only change argv/UX if multi-build reliability requires it |
| Watch completed historical rows indefinitely | “Never miss a past failure” | Noise storm on every poll of the Actions list | In-flight only; drop after terminal |
| Coalesce multi-build changes into one summary sentence | Avoid overlapping speech | Hides which build failed; fights concurrent-tracking goal | One announcement per build change |

## Feature Dependencies

```
Scrape all check-suite rows
    └──requires──> Stable per-build identity (DOM id + commit/title)
                       └──requires──> Status normalization (aria-label → enum)
                                          └──requires──> In-flight vs terminal classification
                                                 └──requires──> Per-build state map + diff
                                                        ├──requires──> Announce transitions (stderr + say)
                                                        ├──requires──> Drop after terminal
                                                        └──enhances──> Concurrent multi-change emit

Safe say (execFile / no shell) ──enhances──> Announce transitions
Scrape-failure guard ──enhances──> Per-build state map (don’t wipe on error)
Module split / no import-side-effect poller ──enhances──> Testable multi-build diff
Overlapping say policy ──conflicts──> Sequential speech queue
HTML scrape continuity ──conflicts──> API-auth private monitoring (this milestone)
In-flight-only tracking ──conflicts──> Permanent history announcer
```

### Dependency Notes

- **Multi-build tracking requires scraping all suites + identity:** First-row-only scrape cannot express concurrency; need `check_suite_*` list keyed by id, with commit/title for speech.
- **Diff/announce requires status normalization:** Live `aria-label`s must map to one vocabulary before color and `say` (today’s mismatch is a reliability blocker).
- **Drop-after-terminal requires in-flight classification:** Without queued/running vs success/failure/cancel, the tracker cannot know when to stop.
- **Scrape-failure guard protects the map:** A failed poll must skip the tick, not clear tracking or throw on `undefined`.
- **Overlapping say conflicts with a speech queue:** PROJECT chose overlap; do not build queue unless a later milestone revisits audio clarity.
- **Reliability then refactor:** Multi-build + crash/status fixes unlock safe module split; refactor enhances testability but must not block the concurrent tracker.

## MVP Definition

### Launch With (v1)

Minimum for this **subsequent milestone** (concurrent builds fix + reliability). Existing single-build poll/say is assumed baseline.

- [ ] **Scrape all in-flight check suites** — without this, concurrent tracking is impossible
- [ ] **Per-build state map + transition diff** — announce each build’s meaningful changes
- [ ] **Identity by commit/title (+ suite id for tracking)** — correct speech under concurrency
- [ ] **In-flight only; drop after terminal announce** — avoid historical noise
- [ ] **Multi-change emit (overlapping `say` OK)** — don’t drop sibling finishes
- [ ] **Status normalization for colors + speech** — live labels must drive output
- [ ] **Scrape-failure safe poll** — no crash on `undefined` / network/DOM miss

### Add After Validation (v1.x)

Once concurrent announce is trusted in daily use.

- [ ] **Module split + poller not on import** — safer tests and maintenance (PROJECT: after reliability)
- [ ] **Safe `say` via argv (`execFile`)** — closes shell-injection debt tied to scraped titles
- [ ] **Bounded tracked-id history / prune** — long-running monitors won’t grow forever
- [ ] **Poll in-flight guard / backoff** — avoid piled `got`+jsdom when GitHub is slow

### Future Consideration (v2+)

Defer until product direction explicitly expands.

- [ ] GitHub API / auth mode — private repos, stable fields
- [ ] Speech queue or distinct voices per build — only if overlapping audio becomes painful
- [ ] Workflow-name filtering / multi-URL config
- [ ] Cross-platform notifiers / Notification Center
- [ ] Locale productization (Japanese dictionary)
- [ ] TUI or dashboard features

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Track all in-flight builds concurrently | HIGH | MEDIUM | P1 |
| Per-build transition announce + drop after terminal | HIGH | MEDIUM | P1 |
| Multi-change emit (overlap OK) | HIGH | LOW | P1 |
| Identity by commit/title | HIGH | LOW | P1 |
| Status normalization (aria-label → color/speech) | HIGH | MEDIUM | P1 |
| Scrape-failure crash fix | HIGH | LOW | P1 |
| Safe `say` (no shell) | MEDIUM | LOW | P2 |
| Module refactor / no import poller | MEDIUM | MEDIUM | P2 |
| Poll mutex / backoff | MEDIUM | LOW | P2 |
| Speech queue | LOW | MEDIUM | P3 |
| API auth / private / filters / TUI | LOW* | HIGH | P3 |

\*Low for *this* milestone’s stated goals; high for a general CI product — explicitly out of scope here.

**Priority key:**
- P1: Must have for this milestone launch
- P2: Should have in later phases of the same milestone (cleanup)
- P3: Nice to have / future — do not build now

## Competitor Feature Analysis

| Feature | `gh run watch` | Multi-run TUIs (gitwatch / gh-hud / actiontui) | TTS stacks (agent-notify) | Our Approach |
|---------|----------------|-----------------------------------------------|---------------------------|--------------|
| Concurrent in-flight tracking | No (one run-id; exits on complete) | Yes (list/grid; filter queued/running) | N/A (event sink, not Actions poller) | Yes — map of all in-flight suites from one Actions URL |
| Announce / notify on finish | Chain `&& notify-send` / external | Bell, desktop notify + sound (actiontui) | `say` + audio queue | stderr + macOS `say`; overlap allowed |
| Build identity in alert | Run progress UI (eyes-on) | Workflow name / repo / commit in TUI | Caller-supplied message | Speak commit/title (current style) |
| In-flight vs history | Watches one run to terminal | Often filter in_progress/queued; brief completed window | N/A | In-flight only; drop after terminal |
| Auth model | GitHub CLI auth / API | `gh` / API | Local notify server | Public HTML scrape (no token) |
| Speech overlap policy | N/A | Usually one notify at a time | Sequential TTS queue | Overlapping OK (explicit decision) |
| Dashboard / re-run / cancel | Progress view only | Common | No | **Don’t build** |

## Concurrent / In-Flight Behavior (Expected)

What “correct” looks like when multiple workflows run at once — the focus of this research slice:

1. **Discovery:** Each poll returns every visible queued/running check suite (plus any tracked suite that just flipped terminal).
2. **Tracking:** New in-flight ids enter the map; identity for speech = commit/title; key for state = suite/build id.
3. **Transitions:** For each id, if status changed vs last snapshot → one announcement (stderr + `say`).
4. **Concurrency:** If three builds finish in the same poll, three announcements fire; overlapping speech is acceptable.
5. **Retirement:** After a terminal status is announced, stop tracking that id so historical list rows don’t re-trigger.
6. **Failure isolation:** A bad poll skips updates; it must not crash the interval or wipe the map.
7. **Non-goals under concurrency:** No merge into a single “N builds finished” summary; no speech queue; no workflow-name filter; no watching only the top row.

## Sources

- GitHub CLI manual — [`gh run watch`](https://cli.github.com/manual/gh_run_watch) (Context7 `/websites/cli_github_manual`) — single-run watch, interval, chain-to-notify pattern — confidence MEDIUM–HIGH (docs)
- [Wiredepth gitwatch](https://github.com/WiredepthHQ/wiredepth-gitwatch) — multi-run TUI motivation (`gh run watch` exits; concurrent CI+Deploy+dependabot) — confidence MEDIUM
- [gh-hud](https://github.com/mquinnv/gh-hud) — multi-workflow grid; default `filterStatus: in_progress, queued`; `showCompletedFor` — confidence MEDIUM
- [actiontui](https://github.com/jfarcand/actiontui) — multi-repo watch; desktop notify + sound on red/green transitions; state diff — confidence MEDIUM
- [gh-hound](https://github.com/indrasvat/gh-hound) — event-group “hunt” watch for concurrent workflows on one commit — confidence MEDIUM
- [agent-notify](https://github.com/F1LT3R/agent-notify) — macOS `say` + **sequential** TTS queue (contrast to our overlap policy) — confidence MEDIUM
- Project decisions — `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `index.js` — confidence HIGH for local requirements

---
*Feature research for: GitHub Actions CI status monitor / build announcer (concurrent in-flight focus)*
*Researched: 2026-07-24*
