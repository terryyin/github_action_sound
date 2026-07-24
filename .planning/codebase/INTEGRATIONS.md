# External Integrations

**Analysis Date:** 2026-07-24

## APIs & External Services

**GitHub Actions (HTML scrape, not official API):**
- Polls a user-supplied GitHub Actions URL every 5 seconds
- SDK/Client: `got` (`index.js` `buildState`)
- Parsing: `jsdom` selects `[id^='check_suite_']`, SVG `aria-label` status, and `span.Link--primary` commit text
- Auth: None — unauthenticated HTTP GET of public Actions pages
- Input: CLI URL argument (e.g. `https://github.com/<org>/<repo>/actions`)

**macOS speech / audio:**
- `say` via `child_process.exec` for status announcements (`index.js` `say`)
- Optional local helper `who.sh` pipes CLI output and plays `~/Downloads/who.mp3` with `afplay` on failure lines
- Auth: Not applicable (local OS commands)

**npm registry:**
- Package publish target for releases
- Client: `npm publish` in `.github/workflows/release.yml`
- Auth: npm Trusted Publishing (OIDC) — `id-token: write`; no long-lived `NPM_TOKEN`

## Data Storage

**Databases:**
- Not applicable — no database

**File Storage:**
- Local filesystem only (no cloud object storage)
- Optional local audio file referenced by `who.sh` (`~/Downloads/who.mp3`)

**Caching:**
- None at application level
- CI uses `actions/setup-node` pnpm cache (`.github/workflows/ci.yml`, `release.yml`)

## Authentication & Identity

**Auth Provider:**
- Not applicable for the CLI consumer path (public page scrape)
- CI publish identity: GitHub Actions OIDC → npm Trusted Publishing
  - Implementation: `permissions.id-token: write` + npm trusted publisher configured for workflow `release.yml`
  - Documented in `README.md` and `.cursor/rules/release.mdc`

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- `console.error` for colored status lines and fetch/exec errors (`index.js`)
- No structured logging or external log sink

## CI/CD & Deployment

**Hosting:**
- Not hosted — distributed via npm as CLI package `github_action_sound`
- Repository: `https://github.com/terryyin/github_action_sound`

**CI Pipeline:**
- GitHub Actions CI (`.github/workflows/ci.yml`):
  - Triggers: push/PR to `main` or `master`
  - Steps: checkout → pnpm setup → Node `24.12.0` → `pnpm install --frozen-lockfile` → `pnpm test`
- GitHub Actions Release (`.github/workflows/release.yml`):
  - Triggers: push of tags matching `v*`
  - Steps: CHANGELOG section check → install → test → set version from tag → `npm publish --access public`

## Environment Configuration

**Required env vars:**
- None for running the CLI
- Dev-only: Devbox/Corepack tooling via `devbox.json` / `set-env.sh` (not application secrets)

**Secrets location:**
- No app secrets required
- Publish auth is OIDC to npm (no repo `NPM_TOKEN` expected after Trusted Publishing setup)
- `.env` / `.env.test` listed in `.gitignore` but unused by application code

## Webhooks & Callbacks

**Incoming:**
- None — CLI polls outbound; no HTTP server

**Outgoing:**
- Periodic HTTP GET to the provided GitHub Actions URL (`setInterval` 5000ms in `index.js`)
- No webhook subscriptions to GitHub Events API

---

*Integration audit: 2026-07-24*
