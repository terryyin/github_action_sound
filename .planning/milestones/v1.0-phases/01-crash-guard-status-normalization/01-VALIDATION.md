---
phase: 1
slug: crash-guard-status-normalization
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest ^30.2.0 (+ babel-jest) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `nix-shell -p nodejs --run 'pnpm test'` |
| **Full suite command** | `nix-shell -p nodejs --run 'pnpm test'` |
| **Estimated runtime** | ~5–15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command (Task 1: grep structural verify only)
- **After every plan wave:** Full suite must be green
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|---------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | REL-01, REL-02 | — | null scrape; no shell change | structural | `grep -n "normalizeStatus\|return null\|newState == null\|Status\." index.js` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | REL-01, REL-03, REL-04 | — | N/A | unit | `nix-shell -p nodejs --run 'pnpm test'` | ⚠️ rewrite W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | REL-02, REL-03 | — | N/A | unit | `nix-shell -p nodejs --run 'pnpm test'` | ⚠️ after 01 | ⬜ pending |
| 01-02-02 | 02 | 2 | REL-04 | — | N/A | unit | `nix-shell -p nodejs --run 'pnpm test'` | ⚠️ fixtures | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/sound-monitor.spec.js` — rewrite dotted status literals → Status enum; add null scrape cases; add live-shaped aria-label fixtures
- [ ] Export `Status` / `normalizeStatus` for direct unit asserts

*Existing Jest infrastructure covers the framework; Wave 0 is test rewrite only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optional live smoke | REL-01 | Needs real network / Actions URL | Run CLI, briefly disrupt network; confirm no throw and monitor continues |

*Core phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-24 (orchestrator after plan-check blockers fixed)
