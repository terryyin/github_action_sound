# Project Research Summary

**Project:** github_action_sound — Concurrent Builds Fix
**Domain:** macOS Node CLI — GitHub Actions HTML scrape poller + local speech announce
**Researched:** 2026-07-24
**Confidence:** HIGH

## Executive Summary

This is a brownfield macOS CLI that polls a public GitHub Actions page, scrapes check-suite status, and announces transitions via colored stderr and `say`. The milestone’s job is correctness under concurrent in-flight builds: scrape every suite, track queued/running ids in a Map, announce each meaningful transition (overlapping speech OK), then drop after terminal — without becoming a TUI, API client, or stack rewrite.

Experts build this as a single-process poll → scrape-all → normalize → per-id diff → fan-out announce pipeline. Research recommends **keeping** Node ≥24.12 CJS, pnpm 10.x, `got@11.8.6`, `jsdom@26`, and Jest 30; change only stdlib speech (`execFile`) and domain logic. Reliability (crash guard, status enum, multi-build store) must land before modular extraction.

Main risks are first-row-only scrape, aria-label vocabulary mismatch, undefined scrape crashes, forever-blacklist mute, title-as-map-key collisions, and overlapping poll races. Mitigate with suite-id Map lifecycle, normalize-at-boundary, no-op failed ticks, and single-flight polls — then split modules once behavior is green.

## Key Findings

### Recommended Stack

Details: [STACK.md](./STACK.md)

Stabilize on the current CJS stack. No new runtime deps for concurrent tracking. Optional later: Node `fetch` (stay CJS) or ESM+`got@15`; optional `jsdom@29` / Jest 30.4.x after reliability. Do not add Octokit, cheerio, Vitest, TypeScript, or speech-queue libraries this milestone.

**Core technologies:**
- **Node.js ≥24.12 (LTS 24.x):** CLI runtime — already pinned; built-in `fetch`/`execFile` available without new packages
- **`got@11.8.6` + `jsdom@26.1.0`:** HTTP GET + DOM scrape — last CJS-friendly got; keep scrape model (project decision)
- **Jest 30 + Babel:** Unit tests with `jest.mock('got')` — keep CJS mocks; patch OK
- **`Map` + `execFile('say', …)`:** In-flight store + speech — stdlib only; eliminate shell injection

### Expected Features

Details: [FEATURES.md](./FEATURES.md)

Product is a hands-free side-monitor, not a dashboard. Table stakes are concurrent in-flight tracking and trustworthy announce; differentiator vs `gh run watch` is multi-build speech without a TUI.

**Must have (table stakes):**
- Scrape all check suites + track all in-flight builds — concurrent CI is the bug this milestone fixes
- Per-build transition announce + drop after terminal — no historical noise storm
- Status normalization (live `aria-label` → enum) — colors/speech work on real pages
- Multi-change emit (overlapping `say` OK) + scrape-failure safe poll — don’t drop siblings or crash

**Should have (competitive / same-milestone cleanup):**
- Module split + no import-side-effect poller — testable seams after reliability
- Safe `say` via `execFile` — scraped titles must not hit a shell
- Poll in-flight guard / bounded prune — long runs stay correct

**Defer (v2+):**
- GitHub API / auth, speech queue, TUI, multi-repo, filters, Notification Center, Japanese product wiring

### Architecture Approach

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

Evolve the existing poll → scrape → diff → say loop into scrape-all → normalize → `InFlightBuildStore` (Map by suite id) → transition fan-out. Reliability work can stay in `index.js`; extract `scrape` / `status` / `store` / `announce` / `cli` only after multi-build behavior is proven. Patterns: snapshot-diff per entity, normalize-at-boundary, fire-and-forget fan-out, scrape-all / track-few.

**Major components:**
1. **CLI / Poller** — argv URL, interval ticks, skip store update on scrape failure
2. **Suite Scraper + Status Normalizer** — all `check_suite_*` rows; aria-label → closed enum
3. **InFlightBuildStore + Transition Engine** — admit queued/running; per-id diff; drop after terminal announce
4. **Announcement Fan-out** — `say` × N immediately (overlap OK); stderr colors from enum

### Critical Pitfalls

Details: [PITFALLS.md](./PITFALLS.md)

1. **First-row / DOM-order identity** — use `querySelectorAll` + Map keyed by suite id; never “top row = the build”
2. **Status vocabulary mismatch** — normalize once at scrape; drive color/speech/lifecycle from enum; fixture-lock live labels
3. **Undefined scrape into update path** — no-op tick; keep Map intact; per-row skip malformed suites
4. **Forever blacklist (`previousBuildNames`)** — in-flight set only; announce terminal then delete; allow re-admit
5. **Title-as-key collision + poll races** — key by DOM id, speak title; single-flight poll; commit state before async `say`

## Implications for Roadmap

Based on research, suggested phase structure (reliability → cleanup; one milestone):

### Phase 1: Crash Guard + Status Normalization
**Rationale:** Failed ticks and raw aria-labels make multi-build predicates untrustworthy; fix foundations first.
**Delivers:** Non-throwing poll on scrape failure; `normalizeStatus` → enum; color/diff driven by enum; fixture-aligned tests.
**Addresses:** Scrape-failure crash; status normalization (FEATURES P1).
**Avoids:** Undefined-into-update crash; late/never normalize; synthetic dotted status literals in tests.

### Phase 2: Multi-Build Tracking + Fan-out
**Rationale:** Core value — concurrent in-flight announce — depends on Phase 1 enums and safe ticks.
**Delivers:** `querySelectorAll` scrape; `InFlightBuildStore` Map; per-id transitions; multi-change emit; drop after terminal; concurrent HTML fixtures.
**Uses:** Existing got + jsdom; stdlib `Map`; fire-and-forget announce policy.
**Implements:** Suite Scraper (all suites), InFlightBuildStore, Transition Engine, Announcement Fan-out.
**Avoids:** First-row-only; forever blacklist; title-only map keys; speech queues; API migration.

### Phase 3: Modular Cleanup + Tech Debt
**Rationale:** Project phasing — extract modules only after multi-build behavior is green; seams become mechanical.
**Delivers:** Flat modules (`scrape` / `status` / `store` / `announce` / `cli`); `require.main` poller guard; `execFile('say')`; optional poll mutex/prune; optional dead JP dict removal.
**Uses:** Node `child_process.execFile`; same CJS stack (no framework).
**Avoids:** Refactor-before-correctness; CLI UX redesign; ESM/`got@15` rewrite.

### Phase Ordering Rationale

- Normalization + null-safety unlock correct in-flight/terminal predicates before the Map store ships
- Multi-build proves component seams; extraction then copies proven boundaries (ARCHITECTURE build order A→B→C)
- Reliability-first avoids moving bugs across files and matches PROJECT “reliability then refactor”
- Stack keep-vs-change: behavior work in stdlib + domain; dependency upgrades deferred to cleanup/later milestones

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Fresh public Actions HTML capture — live `aria-label` vocabulary and selectors may drift from fixtures
- **Phase 2:** Tracked suite vanishes from DOM without terminal scrape — timeout drop vs keep-until-terminal edge case

Phases with standard patterns (skip research-phase):
- **Phase 1:** Guard + normalize-at-boundary — well-documented in codebase CONCERNS + architecture research
- **Phase 3:** Flat CJS module split + `execFile` — standard Node patterns once Phase 2 is green

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Registry versions + keep CJS/`got@11` verified; product forbids stack rewrite |
| Features | MEDIUM | Competitor landscape MEDIUM; local requirements HIGH from PROJECT.md |
| Architecture | HIGH | Brownfield + locked decisions; ecosystem analogies only MEDIUM |
| Pitfalls | HIGH | Most failure modes verified in `index.js` / tests / CONCERNS |

**Overall confidence:** HIGH

### Gaps to Address

- **Live aria-label / DOM fixtures:** Recapture during Phase 2 planning; assert enum path from real labels
- **Vanished-row lifecycle:** Decide absence policy when planning Phase 2 store rules; default keep-on-empty-scrape
- **`execFile` phase placement:** Prefer with Phase 3 unless titles with quotes block Phase 2 announce tests — then pull into reliability
- **Optional dep bumps (jsdom 29, pnpm 10.34, Node 24.18):** Only after green multi-build suite; not roadmap blockers

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — milestone scope, decisions, phasing
- Local codebase — `index.js`, `__tests__/sound-monitor.spec.js`, `.planning/codebase/*`
- npm registry / nodejs.org — package and Node 24.18.0 LTS versions (2026-07-24)
- Node.js v24 child_process docs — `execFile` vs `exec`
- Research outputs — [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md)

### Secondary (MEDIUM confidence)
- Context7 — got, jsdom, Jest 30, Node 24 APIs, `gh run watch` manual
- Ecosystem peers — gh-hud, gitwatch, actiontui, gh-hound, agent-notify (feature contrast)
- GitHub Docs — workflow runs REST (verified; out of scope this milestone)

### Tertiary (LOW confidence)
- Generic scrape-monitor / async-interval community guidance — adapt carefully to local CLI
- Distributed fan-out analogies — deliberately not applicable (no Redis/queues)

---
*Research completed: 2026-07-24*
*Ready for roadmap: yes*
