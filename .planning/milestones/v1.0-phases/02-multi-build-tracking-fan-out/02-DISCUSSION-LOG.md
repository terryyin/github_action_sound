# Phase 2: Multi-Build Tracking + Fan-out - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 2-Multi-Build Tracking + Fan-out
**Mode:** `--auto` (recommended defaults selected)
**Areas discussed:** Suite absence policy, Admission and terminal classification, First-seen and fan-out behavior

---

## Suite absence policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep until terminal; never invent finish from absence | Tracked id missing from a successful multi-suite scrape stays in Map | ✓ |
| Soft-drop after N consecutive misses | Treat prolonged absence as gone without terminal announce | |
| Treat absence as terminal success/unknown finish | Announce and delete when row disappears | |

**User's choice:** [auto] Keep until terminal; never invent finish from absence
**Notes:** Aligns with research SUMMARY/ARCHITECTURE default and STATE open concern. Null/failed scrape still skips store entirely (Phase 1).

| Option | Description | Selected |
|--------|-------------|----------|
| No N-miss prune this phase | Keep-until-terminal only | ✓ |
| Add timeout prune now | Bound Map for long runs | |

**User's choice:** [auto] No N-miss prune this phase
**Notes:** Deferred to later hardening.

---

## Admission and terminal classification

| Option | Description | Selected |
|--------|-------------|----------|
| Admit queued + running only | Historical completed rows never enter Map | ✓ |
| Admit any non-terminal including action_required | Broader admission | |

**User's choice:** [auto] Admit queued + running only

| Option | Description | Selected |
|--------|-------------|----------|
| Terminal = success, failure, cancelled, skipped | Announce once then delete | ✓ |
| Terminal includes action_required | Drop on action_required | |
| Terminal = success/failure only | Ignore cancel/skip for drop | |

**User's choice:** [auto] Terminal = success, failure, cancelled, skipped

| Option | Description | Selected |
|--------|-------------|----------|
| action_required: announce if tracked, keep tracking, no first-admit | Attention state | ✓ |
| action_required: terminal drop | | |
| action_required: ignore entirely | | |

**User's choice:** [auto] Announce if tracked; keep; do not first-admit

| Option | Description | Selected |
|--------|-------------|----------|
| unknown: keep tracked; skip speech | Phase 1 D-05 continuity | ✓ |
| unknown: drop silently | | |

**User's choice:** [auto] Keep; skip speech

---

## First-seen and fan-out behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Announce on first admission | New-build + title + status | ✓ |
| Silent adopt on first sight | Only announce later transitions | |

**User's choice:** [auto] Announce on first admission
**Notes:** Cold start will speak currently in-flight suites once — acceptable for a sound monitor.

| Option | Description | Selected |
|--------|-------------|----------|
| Scrape/DOM order; one announce per change | Deterministic fan-out | ✓ |
| Priority order (failures first) | | |
| Coalesce into one summary sentence | Forbidden by MULTI-04 | |

**User's choice:** [auto] Scrape/DOM order; one announce each

| Option | Description | Selected |
|--------|-------------|----------|
| Refresh title each successful scrape | Latest title for next announce | ✓ |
| Freeze title at first admission | | |

**User's choice:** [auto] Refresh title each successful scrape

---

## Claude's Discretion

- InFlightBuildStore API shape inside monolith
- `buildStates` naming / return type details
- Optional single-flight poll mutex if cheap
- Multi-suite fixture HTML layout details

## Deferred Ideas

- Phase 3: execFile say, require.main guard, module split
- N-miss soft-delete prune
- v2 speech queue / distinct voices
- Overlapping-poll mutex if not included cheaply in Phase 2
