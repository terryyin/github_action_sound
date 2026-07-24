---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-07-24T09:40:03.852Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 03 | unrun-verify | cli.js |  | Bounded public Actions CLI smoke produced no in-flight title-bearing transition; audible live verification remains pending. | open |  | 2026-07-24T09:40:03.852Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "cli.js",
    "line": null,
    "description": "Bounded public Actions CLI smoke produced no in-flight title-bearing transition; audible live verification remains pending.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-24T09:40:03.852Z",
    "resolved_at": null
  }
]
````
