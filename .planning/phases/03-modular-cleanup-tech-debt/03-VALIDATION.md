---
phase: 3
slug: modular-cleanup-tech-debt
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `nix --version >/dev/null && pnpm test --runInBand` |
| **Full suite command** | `nix --version >/dev/null && pnpm test --runInBand` |
| **Estimated runtime** | ~5–15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `nix --version >/dev/null && pnpm test --runInBand`
- **After every plan wave:** Run `nix --version >/dev/null && pnpm test --runInBand`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 1 | SAFE-01, SAFE-02, STRUCT-01 | T-03-01, T-03-02 | Direct argv speech boundary; inert library import; executable-only CLI tracer | unit/integration | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test --runInBand` | ❌ task creates | ⬜ pending |
| 03-01-02 | 03-01 | 1 | SAFE-01, SAFE-02 | T-03-03, T-03-04 | Overlapping best-effort speech and locked package entry routing | unit/static | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test --runInBand` | ❌ task creates | ⬜ pending |
| 03-02-01 | 03-02 | 2 | SAFE-01, SAFE-02, STRUCT-01 | T-03-05…T-03-09 | Phase 2 matrix and safety boundaries stay green through four extracted modules | unit/integration | `nix shell nixpkgs#nodejs_24 nixpkgs#pnpm --command pnpm test --runInBand` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Task IDs map directly to the executable plans.

---

## Wave 0 Requirements

- [ ] Extend `__tests__/sound-monitor.spec.js` — argv-form `execFile` assertion (SAFE-01)
- [ ] Extend `__tests__/sound-monitor.spec.js` — import-side-effect / no-timer assertion (SAFE-02); remove `clearInterval(timer)` teardown
- [ ] Package entry assertion or documented manual CLI smoke (`main`/`bin`/`scripts.sound`)

These test-first gaps are assigned to Tasks 03-01-01 and 03-01-02; `wave_0_complete` remains false until execution creates them.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Public CLI still works | STRUCT-01 / ROADMAP #4 | Needs macOS `say` + live or fixture URL | Run `github_action_sound <actions-url>` (or `pnpm sound …`) and confirm poll + announce still work |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
