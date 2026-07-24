# Architecture Research

**Domain:** Multi-build GitHub Actions polling scrape CLI (macOS announce)
**Researched:** 2026-07-24
**Confidence:** HIGH (brownfield codebase + project decisions); ecosystem analogies MEDIUM

## Standard Architecture

### System Overview

Evolve the existing poll → scrape → diff → say loop into a multi-build-aware pipeline without changing the product surface (`github_action_sound <actions-url>`).

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI / Poller (entry)                         │
│            argv URL → interval tick → one job per tick           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Suite Scraper│→ │ Status       │→ │ InFlightBuildStore     │ │
│  │ (all suites) │  │ Normalizer   │  │ Map<buildId, snapshot> │ │
│  └──────────────┘  └──────────────┘  └───────────┬────────────┘ │
│                                                  │               │
│                                       ┌──────────▼────────────┐ │
│                                       │ Transition Engine     │ │
│                                       │ (per-build diff)      │ │
│                                       └──────────┬────────────┘ │
│                                                  │               │
│                                       ┌──────────▼────────────┐ │
│                                       │ Announcement Fan-out  │ │
│                                       │ say() × N (overlap OK)│ │
│                                       └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │ HTTP GET (got)                    │ side effects
         ▼                                   ▼
┌─────────────────────┐            ┌─────────────────────────────┐
│ GitHub Actions HTML │            │ stderr (ANSI) + macOS `say` │
└─────────────────────┘            └─────────────────────────────┘
```

**Current vs target**

| Concern | Today (`index.js`) | Target |
|---------|-------------------|--------|
| Scrape | `querySelector` → first suite only | `querySelectorAll` → all `[id^='check_suite_']` |
| State | `MostRecentUpdate` singleton + `lastBuildState` + forever `previousBuildNames[]` | `InFlightBuildStore`: Map keyed by suite id; track only queued/running; drop on terminal |
| Diff | Compare against one previous build | Diff each tracked build independently; emit 0..N announcements per tick |
| Status | Raw aria-label mixed with dotted/colon variants | Normalize once after scrape into a closed enum |
| Announce | One `say` per tick | Fan-out: fire `say` for every transition (overlapping OK) |

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI / Poller** | Read URL; schedule ticks; guard scrape failures so a bad tick never throws into the update path | `actionSoundJob` + `setInterval` (later: `require.main` guard / `cli.js`) |
| **Suite Scraper** | Fetch Actions HTML; extract **all** check-suite rows (id, raw status aria-label, commit/title) | `buildStates(url)` → `BuildState[]` via jsdom `querySelectorAll` |
| **Status Normalizer** | Map scraped aria-label strings → canonical status enum used by color, speech, and lifecycle | Pure function at scrape boundary: `normalizeStatus(raw) → Status` |
| **Build snapshot (`BuildState`)** | Hold one suite’s id, normalized status, identity title (`gitLog`) | Existing class; status field becomes enum, not raw label |
| **InFlightBuildStore** | Per-build previous snapshot; admit new in-flight builds; drop after terminal announcement | Replace `MostRecentUpdate`; `Map<buildName, BuildState>` |
| **Transition Engine** | Per build: new / status-changed / unchanged / terminal-then-forget | Evolves `diffToSentence` + store update rules |
| **Announcement Fan-out** | Emit every non-empty transition immediately (no speech queue) | Loop `say(statement, colorCode)` |
| **Announcer (`say`)** | Colored stderr + macOS speech | Keep interface; harden with `execFile` in cleanup phases |

## Recommended Project Structure

Reliability work can stay in `index.js`. Modular split comes **after** multi-build + crash + normalize behave correctly (project phasing).

```
# Phase target after reliability (cleanup / refactor)
index.js                 # thin re-exports + bin entry OR cli-only
cli.js                   # argv, poller start (require.main only)
scrape.js                # buildStates(url), selectors, got + JSDOM
status.js                # Status enum + normalizeStatus + color map
build-state.js           # BuildState + diffToSentence(dictionary)
store.js                 # InFlightBuildStore (ex-MostRecentUpdate)
announce.js              # say() + ANSI helpers
dictionaries.js          # englishDictionary (JP optional/deferred)
__tests__/
  scrape.spec.js
  status.spec.js
  store.spec.js
  sound-monitor.spec.js  # integration: multi-build fixtures
```

### Structure Rationale

- **Keep flat root modules (no forced `src/`):** Matches current package layout and STRUCTURE.md guidance; avoid inventing a layer until modules exist.
- **Scrape isolated:** DOM selectors are the brittle contract; confine GitHub HTML knowledge to `scrape.js`.
- **Normalize before store:** Prevents aria-label drift from poisoning color, speech, and in-flight classification.
- **Store owns lifecycle:** Admission (queued/running) and eviction (after terminal announce) live in one place so historical completed rows on the page do not spam.
- **Poller last to extract:** Side-effect-free library entry unblocks tests; do this in the refactor phase, not as a prerequisite to multi-build logic.

## Architectural Patterns

### Pattern 1: Snapshot-Diff Per Entity (evolve MostRecentUpdate)

**What:** Each poll produces a full page snapshot `BuildState[]`. The store diffs **by build id** against its previous per-id snapshot and returns a list of announcements.

**When to use:** Always for this milestone — concurrent in-flight builds are the core value.

**Trade-offs:** Slightly more logic than a single “latest row” tracker; still trivial at Actions-page cardinality (tens of rows, not thousands). Avoids distributed fan-out infra (Redis/Kafka) inappropriate for a local CLI.

**Example:**
```javascript
// Conceptual — InFlightBuildStore replaces MostRecentUpdate
function applySnapshot(store, scraped) {
  const announcements = [];
  for (const next of scraped) {
    if (!isInFlight(next.status) && !store.has(next.buildName)) continue; // ignore historical
    const prev = store.get(next.buildName);
    if (!prev) {
      store.set(next.buildName, next);
      announcements.push(announceNew(next));
      continue;
    }
    if (prev.status !== next.status) {
      announcements.push(announceTransition(prev, next));
      store.set(next.buildName, next);
    }
    if (isTerminal(next.status)) store.delete(next.buildName); // drop after announce
  }
  // Optional: drop tracked ids that vanished from DOM without terminal (see pitfalls)
  return announcements;
}
```

### Pattern 2: Normalize-at-Boundary

**What:** Immediately after reading `svg[aria-label]`, map to a closed set (e.g. `queued | running | success | failed | unknown`). Color maps, dictionaries, and `isInFlight` / `isTerminal` all key off the enum.

**When to use:** Before (or with) multi-build — status mismatch already breaks colors today.

**Trade-offs:** Must maintain a mapping table when GitHub changes aria-label wording; unknown statuses should log once and degrade safely (no crash, no wrong color).

**Example:**
```javascript
const STATUS = { QUEUED: 'queued', RUNNING: 'running', SUCCESS: 'success', FAILED: 'failed', UNKNOWN: 'unknown' };

function normalizeStatus(ariaLabel) {
  const s = (ariaLabel || '').toLowerCase().replace(/[:.\s]+$/g, '').trim();
  if (s.includes('queued')) return STATUS.QUEUED;
  if (s.includes('currently running') || s === 'running') return STATUS.RUNNING;
  if (s.includes('completed successfully') || s.includes('success')) return STATUS.SUCCESS;
  if (s.includes('failed') || s.includes('failure')) return STATUS.FAILED;
  return STATUS.UNKNOWN;
}
```

### Pattern 3: Fire-and-Forget Fan-out (no speech queue)

**What:** For each announcement in the tick, call `say` immediately. Overlapping `say` processes are acceptable per product decision.

**When to use:** This milestone’s announce policy.

**Trade-offs:** Concurrent speech can be hard to hear; simpler and lower latency than a queue. Do **not** introduce a speech serializer in v1.

### Pattern 4: Scrape-all, Track-few

**What:** Scrape every check suite on the page, but only **admit** builds whose normalized status is in-flight (queued/running). Announce terminal transition once, then forget. Completed rows that appear later without prior tracking stay silent.

**When to use:** Required by “in-flight only” decision — prevents noise from historical Actions rows.

**Trade-offs:** A build that finishes between polls without ever being seen in-flight may not announce (acceptable given poll interval + decision). Prefer announcing if we saw it in-flight then see terminal on next scrape.

## Data Flow

### Request Flow (one poll tick)

```
Timer tick
    ↓
Suite Scraper: got(url) → JSDOM → querySelectorAll("[id^='check_suite_']")
    ↓
Status Normalizer: raw aria-label → Status enum (per row)
    ↓
Snapshot: BuildState[]  (id, status, gitLog/title)
    ↓
InFlightBuildStore.apply(snapshot)
    ├── admit new queued/running
    ├── diff status changes for tracked ids
    ├── emit announcement descriptors[]
    └── delete after terminal announce
    ↓
Announcement Fan-out: for each descriptor → say(statement, colorCode)
    ↓
stderr + macOS say (may overlap)
```

### State Management

```
InFlightBuildStore
  Map<buildName /* check_suite_* */, BuildState>
       ↑ apply(snapshot)          ↓ get announcements
  Poller tick  ─────────────────→  Fan-out

Lifecycle:
  absent + in-flight scrape  → insert + "new build" announce
  present + status change    → update + transition announce
  present + terminal status  → announce + delete
  absent + not tracked       → ignore (historical / never seen)
```

### How `MostRecentUpdate` Should Evolve

| Aspect | `MostRecentUpdate` (now) | `InFlightBuildStore` (target) |
|--------|--------------------------|-------------------------------|
| Cardinality | One “current” build | Many concurrent keys |
| Dedup | `previousBuildNames` forever-suppresses returning ids | Suppress only while not tracked; re-admit if id appears in-flight again after drop (optional; default: re-admit on new in-flight sighting) |
| Compare target | Always vs `lastBuildState` (wrong peer when suites interleave) | Always vs **same** `buildName`’s prior snapshot |
| Output | Single `{ statement, colorCode }` | Array of announcements |
| Identity for speech | `gitLog` title (keep) | Keep title in sentence; key store by suite `buildName` |
| Memory | Unbounded name list | Bounded by in-flight count (+ optional prune) |

**Migration tactic:** Implement store API first behind the same poller call site; keep exporting a factory for tests. Update tests from single-state sequences to multi-suite HTML fixtures and Map-based expectations. Retire `previousBuildNames` semantics that permanently mute a suite after it was once “previous.”

### Where Status Normalization Belongs

```
HTML aria-label  →  [Normalizer]  →  BuildState.status (enum)
                         │
                         ├── colorCode()
                         ├── dictionary / diffToSentence
                         ├── isInFlight / isTerminal (store)
                         └── tests assert enum, not raw labels
```

**Do not** normalize inside `say`, dictionaries, or the poller. **Do not** leave raw scrape strings in `colorCode` maps. Normalization is a scrape-boundary concern owned by the scraper (or a tiny `status` module called only from scrape).

### Key Data Flows

1. **Happy multi-build tick:** Two running suites both change → two announcements fired back-to-back.
2. **Terminal drop:** Tracked running → success → announce success → remove from Map → later page scrapes of that completed row produce silence.
3. **Scrape failure:** `buildStates` returns `null`/empty sentinel → poller **skips** store update (no throw). Log error; keep prior Map intact.
4. **Identity:** Store key = scraped suite DOM id (`check_suite_*`); spoken identity = commit/run title (`gitLog`) per product decision.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single public Actions URL, one process (this tool) | In-memory Map; 5s poll; scrape-all + track-in-flight is enough |
| Long-running days/weeks | Ensure terminal delete works; avoid unbounded “seen forever” lists; optional cap on Map size |
| Many repos / private CI | Out of scope — would need API auth, multi-URL config (not this milestone) |

### Scaling Priorities

1. **First bottleneck:** Overlapping poll ticks if `got` is slow — add in-flight mutex or chained `setTimeout` in cleanup (not required to ship multi-build correctness).
2. **Second bottleneck:** GitHub HTML/rate limits — backoff on failures; keep scrape failure non-fatal.

## Anti-Patterns

### Anti-Pattern 1: Track Only the Top DOM Row

**What people do:** `querySelector` first `check_suite_*` and treat it as “the” build.
**Why it's wrong:** Concurrent workflows disappear or overwrite each other’s transitions; finishing builds below the fold never announce.
**Do this instead:** `querySelectorAll` + per-id store.

### Anti-Pattern 2: Global “Last Build” Diff Across Different Suites

**What people do:** Diff suite B against previous suite A when the top row changes.
**Why it's wrong:** Spurious “new build” / wrong status sentences; `previousBuildNames` then permanently mutes A’s real terminal event.
**Do this instead:** Diff only within the same `buildName` key.

### Anti-Pattern 3: Normalize Late (or Never)

**What people do:** Compare and color using raw aria-labels and ad-hoc strings with trailing `: ` / `.`.
**Why it's wrong:** Colors undefined in production; tests pass on synthetic strings; multi-build lifecycle predicates become unreliable.
**Do this instead:** Normalize once at scrape; enum everywhere downstream.

### Anti-Pattern 4: Refactor Modules Before Behavior Is Correct

**What people do:** Split files while still single-suite and crash-on-undefined.
**Why it's wrong:** Moves bugs around; harder to verify multi-build in one place.
**Do this instead:** Reliability order (below), then extract modules along the boundaries already proven.

### Anti-Pattern 5: Speech Queue / Distributed Fan-out

**What people do:** Add Redis pub/sub or a serial `say` queue “for cleanliness.”
**Why it's wrong:** Over-engineering a local CLI; product explicitly allows overlapping speech.
**Do this instead:** Simple loop calling `say` per announcement.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub Actions HTML page | Unauthenticated GET + JSDOM scrape | Brittle DOM; isolate selectors; fixtures per status |
| macOS `say` | `child_process` exec/execFile | Platform-bound; harden escaping in cleanup phase |
| Optional `who.sh` | Pipe stderr, match `"failed"` | Remains external; fan-out still writes stderr lines |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Poller ↔ Scraper | `await buildStates(url)` → array or failure sentinel | Never pass `undefined` into store |
| Scraper ↔ Normalizer | raw label in, enum out | Only call site for normalize |
| Scraper ↔ Store | `BuildState[]` snapshot | Store does not parse HTML |
| Store ↔ Fan-out | `Announcement[]` | Fan-out has no lifecycle logic |
| Fan-out ↔ `say` | statement + color | `say` stays I/O-only |
| Tests ↔ library | require store/scrape without starting poller | Enforce in refactor phase |

## Suggested Build Order (Roadmap Implications)

Reliability **before** modular refactor (project decision). Dependencies:

```
1. Scrape-failure guard (poller)
       ↓ unblocks safe iteration
2. Status normalization (+ color/diff fix)
       ↓ unblocks correct in-flight/terminal predicates
3. Scrape-all suites (querySelectorAll)
       ↓ feeds multi snapshots
4. InFlightBuildStore (MostRecentUpdate → Map + fan-out)
       ↓ delivers core value
5. Multi-build tests / fixtures (queued, running, failed, concurrent)
       ↓ locks behavior
6. Modular extract (scrape / status / store / announce / cli)
       ↓ + poller import side-effect fix, safer say, debt
```

| Phase focus | Delivers | Depends on | Avoids |
|-------------|----------|------------|--------|
| **A — Crash + normalize** | Non-throwing ticks; enum statuses; working colors | — | Refactor churn |
| **B — Multi-build tracking** | All-suites scrape; Map store; fan-out announces; drop on terminal | A | Speech queues; API migration |
| **C — Modular cleanup** | File boundaries; `require.main` poller; safer `say`; prune dead JP if desired | B proven | Redesigning CLI UX |

**Phase ordering rationale:** Normalization and null-safety make multi-build predicates trustworthy; multi-build proves the component seams; extraction then becomes mechanical (not exploratory).

**Research flags for later phases:**
- Phase B: Confirm live aria-label vocabulary with a fresh HTML capture (fixture may be stale vs 2026 UI) — likely needs phase-specific research.
- Phase B: Decide behavior when a tracked suite disappears from the DOM without a terminal scrape (timeout drop vs keep until terminal) — product edge case.
- Phase C: Standard module split; unlikely to need deep research once B is green.

## Sources

- Local codebase architecture map: `.planning/codebase/ARCHITECTURE.md` (2026-07-24) — HIGH
- Local concerns (status mismatch, scrape crash, MostRecentUpdate limits): `.planning/codebase/CONCERNS.md` — HIGH
- Project decisions (track all in-flight, overlapping say, title identity, reliability→refactor): `.planning/PROJECT.md` — HIGH
- Implementation: `index.js`, `__tests__/sound-monitor.spec.js` — HIGH
- jsdom `querySelectorAll` (Context7 `/jsdom/jsdom`) — MEDIUM
- Ecosystem analogies: scrape→normalize→diff→notify CLI pipelines; per-entity Map lifecycle / drop-on-terminal; fan-out without blocking peers (web) — LOW–MEDIUM; adapted down to single-process CLI (no Redis)

---
*Architecture research for: multi-build GitHub Actions scrape monitor*
*Researched: 2026-07-24*
