---
phase: 2
slug: multi-build-tracking-fan-out
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest ^30.2.0 (+ babel-jest) with `jest.mock('got')` |
| **Config file** | `jest.config.js` |
| **Quick run command** | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm exec jest --runInBand` |
| **Full suite command** | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test` |
| **Estimated runtime** | ~5–20 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick serial Jest command
- **After every plan wave:** Full suite must be green
- **Before `/gsd-verify-work`:** Full suite green + optional macOS dual-run smoke
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MULTI-01 | T-02-01 | Title never used as Map key | integration | serial Jest | ⚠️ extend W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | MULTI-02, MULTI-04 | T-02-02 | null scrape preserves Map | unit/integration | serial Jest | ⚠️ extend W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | MULTI-03, MULTI-05 | T-02-02 | absence ≠ terminal delete | unit | serial Jest | ⚠️ after 01 | ⬜ pending |
| 02-02-02 | 02 | 2 | MULTI-06 | — | no forever blacklist | unit | serial Jest | ⚠️ after 01 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — planner fills exact task IDs*

---

## Wave 0 Requirements

- [ ] `__tests__/sound-monitor.spec.js` — compact multi-suite HTML/page factory (two concurrent in-flight rows)
- [ ] Store lifecycle assertions: admit queued/running, terminal drop, re-admit, absent-id keep, action_required keep, unknown skip speech
- [ ] Fan-out / ordered descriptors test without invoking real macOS `say` (mock announce boundary or assert returned descriptors)

*Existing Jest infrastructure covers the framework; Wave 0 is fixture + assertion extension.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dual overlapping live runs | MULTI-03/04 | Needs busy public Actions URL + macOS `say` | Watch a public Actions URL with ≥2 overlapping runs; hear distinct title-identified announcements |

*Core MULTI behaviors have automated verification via fixtures.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
