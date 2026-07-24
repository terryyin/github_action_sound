# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.1.0] - 2026-07-24

### Added

- Multi-build tracking: every queued/running check suite is tracked by id; each meaningful status change is announced with its commit/run title.
- Ordered fan-out: multiple builds changing in one poll each get their own announcement (DOM order).
- Normalized `Status` enum (`queued`, `running`, `success`, `failure`, `cancelled`, `skipped`, `action_required`, `unknown`) driving colors, speech, and lifecycle.
- Modular layout: `scrape.js`, `status.js`, `store.js`, `announce.js` behind an import-inert `index.js` barrel; `cli.js` is the only entry that starts the poller.

### Fixed

- Scrape/network/DOM failures log and no-op without wiping tracked state (crash guard).
- Unknown or missing speech phrases are never spoken.
- Speech uses argv-form `execFile('say', …)` — no scraped text through a shell string.

## [1.0.8] - 2026-03-05

- Release 1.0.8.

## [1.0.7] - 2026-03-05

- GitHub Actions CI workflow (test on push/PR).
- Release workflow: publish to npm on tag push, CHANGELOG gate.
- npm Trusted Publishing (OIDC); no long-lived tokens.
- CHANGELOG.md, release Cursor rule, README releasing docs.

## [1.0.6]

- Initial changelog.

[Unreleased]: https://github.com/terryyin/github_action_sound/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/terryyin/github_action_sound/releases/tag/v1.1.0
[1.0.8]: https://github.com/terryyin/github_action_sound/releases/tag/v1.0.8
[1.0.7]: https://github.com/terryyin/github_action_sound/releases/tag/v1.0.7
[1.0.6]: https://github.com/terryyin/github_action_sound/releases/tag/v1.0.6
