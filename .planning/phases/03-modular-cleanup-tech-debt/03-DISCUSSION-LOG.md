# Phase 3: Modular Cleanup + Tech Debt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 3-Modular Cleanup + Tech Debt
**Areas discussed:** Module boundary layout, CLI vs library entry, Speech argv hardening, Dead code / cleanup scope
**Mode:** `--auto` (recommended defaults selected; no interactive prompts)

---

## Module boundary layout

| Option | Description | Selected |
|--------|-------------|----------|
| Four modules + thin CLI (scrape/status/store/announce) | Matches STRUCT-01 wording exactly | ✓ |
| Minimal extract (say + entry guard only) | Leaves monolith mostly intact | |
| Deep src/ package tree | Heavier than STRUCTURE.md convention | |

**User's choice:** [auto] Four library modules + thin CLI; root-level CJS siblings; preserve Phase 2 behavior bit-for-bit
**Notes:** STRUCTURE.md prefers root siblings over inventing `src/`.

---

## CLI vs library entry

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `cli.js` bin; library main has no poller | Clearest SAFE-02; npm bin retarget | ✓ |
| `require.main === module` guard inside `index.js` only | Smaller diff; easier to miss in tests | |
| Keep import-side-effect timer; document clearInterval | Status quo; fails SAFE-02 | |

**User's choice:** [auto] Separate CLI entry as bin; main/barrel re-exports without side effects; drop test `clearInterval` mitigation after
**Notes:** Update `scripts.sound` to CLI entry.

---

## Speech argv hardening

| Option | Description | Selected |
|--------|-------------|----------|
| `execFile('say', [sentence])` argv form | SAFE-01; no shell interpolation | ✓ |
| Keep `exec` with manual escaping | Error-prone; still shell | |
| Add speech queue while hardening | Scope creep (QUEUE-01) | |

**User's choice:** [auto] execFile argv form; keep overlapping fire-and-forget; log-and-continue on say errors
**Notes:** Empty sentence short-circuit retained.

---

## Dead code / cleanup scope

| Option | Description | Selected |
|--------|-------------|----------|
| Remove unused `japaneseDictionary` | Cleanup debt; LOC-01 stays v2 | ✓ |
| Keep unused dictionary for future locale | Dead code remains | |
| Also do URL allowlist + poll mutex + lint CI | Beyond SAFE/STRUCT success criteria | |

**User's choice:** [auto] Remove japaneseDictionary; defer URL allowlist / mutex / lint CI
**Notes:** Scope guard — Phase 3 stays on SAFE-01/02 + STRUCT-01.

---

## Claude's Discretion

- Exact module filenames
- Whether `index.js` is pure barrel vs thin helpers
- Optional `execFile` stub unit test
- Minimal README bin-path wording if needed

## Deferred Ideas

- CLI URL validation / allowlist
- Poll single-flight mutex
- Speech queue / voices (QUEUE-01)
- Locale productization (LOC-01)
- ESLint / syncpack-in-CI / who.sh productization
- GitHub API / filters / TUI
