# Technology Stack

**Analysis Date:** 2026-07-24

## Languages

**Primary:**
- JavaScript (CommonJS) - CLI app and tests (`index.js`, `__tests__/sound-monitor.spec.js`)

**Secondary:**
- Bash - Dev environment setup and local helper scripts (`set-env.sh`, `who.sh`, `.envrc`)
- YAML - CI/CD workflows (`.github/workflows/ci.yml`, `.github/workflows/release.yml`)

## Runtime

**Environment:**
- Node.js `>=24.12` (pinned in CI/devbox as `24.12.0`)
- Declared in `package.json` `engines.node` and `devbox.json`

**Package Manager:**
- pnpm `>=10.31` (pinned as `pnpm@10.31.0` via `packageManager` field and Corepack in `set-env.sh`)
- Lockfile: `pnpm-lock.yaml` present (lockfileVersion 9.0)
- Install guard: `preinstall` runs `npx only-allow pnpm`

## Frameworks

**Core:**
- None (plain Node.js CLI; no Express/web framework)

**Testing:**
- Jest `^30.2.0` - Unit tests (`jest.config.js`, `__tests__/sound-monitor.spec.js`)
- Babel Jest `^30.2.0` + `@babel/preset-env` - Transform ESM-leaning deps under pnpm for Jest

**Build/Dev:**
- Jetify Devbox - Reproducible Node/pnpm toolchain (`devbox.json`, `devbox.lock`)
- direnv - Auto-loads Devbox via `.envrc`
- syncpack `14.2.0` - Dependency version lint (`pnpm lint:deps`)
- Corepack - Activates pinned pnpm version in Devbox shell (`set-env.sh`)

## Key Dependencies

**Critical:**
- `got` `11.8.6` - HTTP client used to fetch GitHub Actions HTML pages (`index.js`)
- `jsdom` `26.1.0` - Parses Actions HTML to extract check-suite status and commit message (`index.js`)

**Infrastructure:**
- Node built-in `child_process.exec` - Invokes macOS `say` for speech announcements
- `only-allow` (via `npx` at preinstall) - Enforces pnpm-only installs

## Configuration

**Environment:**
- No application runtime env vars required for normal CLI use
- CLI argument: GitHub Actions URL as last `process.argv` entry (`index.js`)
- Devbox sets `DEVBOX_COREPACK_ENABLED=1` in `devbox.json`
- `.env` / `.env.test` ignored by git (`.gitignore`); no committed app secrets

**Build:**
- `babel.config.js` - `@babel/preset-env` targeting current Node
- `jest.config.js` - Node test environment; `transformIgnorePatterns` allowlist for pnpm-hoisted ESM packages (`got`, `jsdom`, and related)
- `pnpm-workspace.yaml` - Declares `onlyBuiltDependencies: [unrs-resolver]` (native build allowlist; not a multi-package workspace)

## Platform Requirements

**Development:**
- macOS preferred for end-to-end sound (uses `say`; optional `afplay` in `who.sh`)
- Node.js `>=24.12`, pnpm `>=10.31`
- Devbox + direnv recommended (`devbox.json`, `.envrc`, `set-env.sh`)

**Production:**
- Published as npm package `github_action_sound` (bin: `./index.js`)
- Consumed as a local CLI on the developer's machine (not a hosted service)
- Effective runtime target: macOS (speech via `say`); scrapes public GitHub Actions HTML

---

*Stack analysis: 2026-07-24*
