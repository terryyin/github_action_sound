# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Concurrent Builds Fix

**Shipped:** 2026-07-24
**Phases:** 3 | **Plans:** 6 | **Sessions:** 1 day (58 commits)

### What Was Built
- Crash-safe polling with a closed 8-value `Status` enum driving colors, speech, and lifecycle (unknown never spoken)
- All-row check-suite scraping with per-suite-id Map tracking, title-identified announcements, DOM-ordered fan-out, terminal retirement, and re-admission
- Shell-safe `execFile` speech, import-inert library barrel, and a scrape/status/store/announce module split that preserved Phase 2 behavior

### What Worked
- The tracer-then-full-matrix plan pattern (thin vertical slice first, then complete lifecycle coverage) kept each phase to two small, fast plans (1–15 min per plan)
- Fixture-locking live-shaped `STATUS:  Run N of …` aria-labels early prevented the synthetic-fixture drift that caused the original bug class
- Dependency-injected `actionSoundJob` made the Phase 3 module extraction a low-risk mechanical move with behavior-preservation tests

### What Was Inefficient
- Phase 2 verification was blocked until the ROADMAP goal was rewritten as a valid MVP user story, forcing a re-verification pass
- Phase 1 finished its plans but never got a formal VERIFICATION.md; the milestone closed with a verification override instead of a clean verified closeout
- STATE.md drifted from reality during the milestone (showed 0 completed phases and a stale "transitioned to Phase 1" note at close), and the readiness tooling miscounted plans by matching `*-PLAN-CHECK.md` as a plan

### Patterns Established
- One-way CommonJS module extraction: preserve proven logic verbatim behind an inert public barrel, never redesign during a refactor phase
- Only observed terminal states retire tracked suites; absence is retained (no miss-count pruning)
- All test runs use the nix prefix: `nix-shell -p nodejs --run 'pnpm test'`

### Key Lessons
1. Verify each phase immediately after execution — deferring Phase 1's verification meant closing the milestone on an override rather than evidence.
2. Write phase goals as valid MVP user stories from the start; goal-format problems surface late as verification blockers.
3. Lock scrape contracts with live-captured fixtures, not synthetic strings — the entire crash class came from fixtures diverging from production labels.

### Cost Observations
- Model mix: not tracked this milestone
- Sessions: single-day milestone, 58 commits
- Notable: plans averaged ~4 minutes of execution; the discuss/plan/verify overhead dominated wall-clock time, not implementation

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 day | 3 | First GSD-tracked milestone on a brownfield CLI; established tracer-then-matrix planning |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | Jest suite (multi-suite scrape, lifecycle, failure no-op, normalization) | not measured | 0 new runtime deps |

### Top Lessons (Verified Across Milestones)

1. (Single milestone so far — candidates above await cross-validation)
