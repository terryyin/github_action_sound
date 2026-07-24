---
phase: 2
slug: multi-build-tracking-fan-out
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Wave 0 fixture/lifecycle coverage is embedded TDD-first inside implementation tasks (no separate Wave 0 plan).

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

- **After every task commit:** Run that task’s `<automated>` command
- **After every plan wave:** Full suite must be green
- **Before `/gsd-verify-work`:** Full suite green + optional macOS dual-run smoke
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MULTI-01..04 | T-02-01, T-02-04 | Map keyed by suite id (never title) | integration | `jest --runInBand --testNamePattern="two-suite fan-out: scrape → Map → ordered announce"` | ❌ created in task (TDD) | ⬜ pending |
| 02-01-02 | 01 | 1 | MULTI-01; D-02 | T-02-02 | null / all-malformed scrape no-op; no store mutation | unit/integration | `jest --runInBand` | ❌ created in task (TDD) | ⬜ pending |
| 02-02-01 | 02 | 2 | MULTI-05/06; D-01/03/05 | T-02-05, T-02-06 | absence ≠ terminal; terminal announce then delete; re-admit | unit | `jest --runInBand --testNamePattern="terminal\|re-admit\|absence\|historical"` | ❌ created in task (TDD) | ⬜ pending |
| 02-02-02 | 02 | 2 | D-06/07/09/10 | T-02-07, T-02-08 | action_required keep; unknown silent; title refresh; order | unit | `pnpm test` | ❌ created in task (TDD) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Jest infrastructure covers the framework. Fixture helpers (`suiteRow` / `suitePage`), store lifecycle assertions, and fan-out tests are created **inside** plans 02-01 / 02-02 as TDD-first tasks — no separate Wave 0 plan or blocking dependency.

- [x] Framework present (`jest.config.js`, `__tests__/sound-monitor.spec.js`)
- [x] Wave 0 work folded into implementation task TDD (wave_0_complete: true)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dual overlapping live runs | MULTI-03/04 | Needs busy public Actions URL + macOS `say` | Watch a public Actions URL with ≥2 overlapping runs; hear distinct title-identified announcements |

*Core MULTI behaviors have automated verification via fixtures. Manual smoke is optional end-of-phase.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (no MISSING refs; Wave 0 folded into TDD tasks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered by existing Jest + in-task fixture creation
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-24 (orchestrator after plan-check blockers fixed)
