---
phase: 3
slug: modular-cleanup-tech-debt
status: draft
nyquist_compliant: false
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
| 03-*-* | TBD | TBD | SAFE-01 | T-shell | `execFile('say', [sentence])` never shell `exec` | unit | `nix --version >/dev/null && pnpm test --runInBand` | ❌ W0 | ⬜ pending |
| 03-*-* | TBD | TBD | SAFE-02 | T-poller | Library require starts no interval/network | unit | `nix --version >/dev/null && pnpm test --runInBand` | ❌ W0 | ⬜ pending |
| 03-*-* | TBD | TBD | STRUCT-01 | — | Phase 2 suite green through extracted modules | unit | `nix --version >/dev/null && pnpm test --runInBand` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Planner must replace TBD task IDs when plans are written.

---

## Wave 0 Requirements

- [ ] Extend `__tests__/sound-monitor.spec.js` — argv-form `execFile` assertion (SAFE-01)
- [ ] Extend `__tests__/sound-monitor.spec.js` — import-side-effect / no-timer assertion (SAFE-02); remove `clearInterval(timer)` teardown
- [ ] Package entry assertion or documented manual CLI smoke (`main`/`bin`/`scripts.sound`)

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
