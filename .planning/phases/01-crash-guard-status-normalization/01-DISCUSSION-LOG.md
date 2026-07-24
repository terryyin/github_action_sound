# Phase 1 — Discussion Log

**Date:** 2026-07-24
**Mode:** `--auto` (recommended defaults)

## Gray areas selected

All: Scrape failure behavior, Status normalization, Testing/fixtures

## Decisions (auto)

| Area | Question | Selected |
|------|----------|----------|
| Scrape failure | What should a failed poll do? | Log + skip update; preserve last state |
| Status enum | Where does normalization live? | At scrape boundary before color/speech/diff |
| Unknown labels | How to handle unrecognized aria-labels? | Map to `unknown`; no crash; skip meaningless announce |
| Fixtures | Live fetch in CI? | No — live-shaped HTML fixtures only |
| Scope | Include execFile / module split? | No — Phase 3 |

## Notes

Project-level decisions from `/gsd-new-project` carried forward; Phase 1 scoped tightly to REL-01…REL-04.
