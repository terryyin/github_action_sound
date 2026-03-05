# github_action_sound
A sound monitor for Github Action, watching and announcing build status.
It uses MacOS "say" command, so only works on Mac for now.

## Usage

```
github_action_sound <github action url>
```

For example:

```
github_action_sound https://github.com/nerds-odd-e/doughnut/actions
```

## Releasing

Releases are published to npm when a new **git tag** is pushed.

1. Create and push a semver tag (e.g. `v1.0.7`):
   ```bash
   git tag v1.0.7
   git push origin v1.0.7
   ```
2. The [Release](.github/workflows/release.yml) workflow runs: tests, then publishes to npm. The version is taken from the tag (no need to bump `package.json` first).
3. Publishing requires the `NPM_TOKEN` secret in the repo (npm automation token). See the workflow file or Cursor rule `.cursor/rules/release.mdc` for details.