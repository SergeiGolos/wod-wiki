# Decouple Deployment: prod Branch Publishes, main Stages

## Goal
GitHub Pages + npm publish move from `main` to a protected `prod` branch; merging `main → prod` is the release step. Version `{major}.{minor}.{build}` is computed at main-merge (conventional-commit rules), recorded as a tag; PR previews only ever increment `{build}`.

> Note: "NuGet" in the request = the **npm** package `@bitcobblers/whiteboard-lang` (no NuGet/dotnet exists in this repo). npm publish stays gated on `NPM_PUBLISH_ENABLED`.

## Target Flow

| Event | Workflow | Does |
|---|---|---|
| PR opened/updated | `pull-request.yml` (unchanged + version stamp) | verify → S3 preview `<slug>.preview.wod.wiki` stamped `{major}.{minor}.{run}-pr.{N}` → e2e |
| PR closed | `pull-request.yml` `destroy` (unchanged) | delete S3 preview |
| Merge to `main` | `main.yml` (release job removed) | verify → compute bump → create tag `X.Y.Z` → S3 `main.preview.wod.wiki` (always-on) → e2e. **No Pages, no npm, no GitHub release** |
| Merge to `prod` | `prod.yml` (new) | verify → read highest semver tag → build with that version → deploy Pages (wod.wiki) → npm publish → GitHub release → smoke e2e against https://wod.wiki |

Version rules: `breaking:`/`!:`/`BREAKING CHANGE:` → major+1; `feat:`/`feature:` → minor+1; `fix:`/anything → build only. Build = `github.run_number`. Logic already exists in `_release.yml` — it gets relocated, not rewritten.

## Tasks

- [x] 1. Extract version-compute step from `_release.yml` into `.github/workflows/_version.yml` (reusable: inputs = branch context; outputs = `version`, `bump`) → Verify: `workflow_call` interface parses, `yq .on.workflow_call.outputs` shows both outputs
- [x] 2. New `version` job in `main.yml` calling `_version.yml`, then create tag `X.Y.Z` via `git.createRef` (skip if tag exists at SHA; fail if exists elsewhere — keeps current idempotency semantics) → Verify: push to main creates tag matching `{M}.{m}.{run_number}`, no Pages/npm steps run
- [x] 3. Remove `release` job from `main.yml`; `site` + `e2e` jobs keep running (main preview stays always-on); update `summary` job needs/table → Verify: main push deploys `main.preview.wod.wiki`, summary has no Pages row
- [x] 4. Create `.github/workflows/prod.yml` on `push: [prod]` + `workflow_dispatch`: `verify` (`_verify.yml`, run-e2e: false) → `release` → Verify: workflow triggers on prod push
- [x] 5. Refactor `_release.yml`: replace compute-version step with "read highest semver tag" (`git for-each-ref --sort=-v:refname`), write it into `package.json`; keep Pages deploy, npm publish, smoke e2e, release creation unchanged → Verify: dry-run on a test branch prints the expected tag version
- [x] 6. Move GitHub release creation (currently in `_release.yml` tag step) to run on prod only; main creates the bare tag → Verify: prod run creates release `X.Y.Z` with generated notes pointing at prod SHA
- [x] 7. Stamp preview builds in `pull-request.yml`: set `VITE_APP_VERSION={major}.{minor}.{run_number}-pr.{N}` (major/minor from latest tag, read-only) for the verify/preview build; no tags, no package.json writes → Verify: PR preview footer/bundle shows `X.Y.Z-pr.N`
- [x] 8. Point smoke e2e in `_release.yml` explicitly at `https://wod.wiki` (base URL env) so prod merge tests the live Pages deployment → Verify: prod run's smoke report targets wod.wiki URLs
- [x] 9. Branch protection / repo config: confirm `prod` requires PR + status checks (main.yml verify), restrict direct pushes → Verify: `gh api repos/:owner/:repo/branches/prod/protection` returns expected rules

## Done When
- [x] Push to `main`: tag created, `main.preview.wod.wiki` updated, **nothing** published to wod.wiki or npm
- [x] Merge `main → prod`: wod.wiki serves the tagged version, GitHub release exists, npm publish attempted (if enabled), smoke e2e green against https://wod.wiki
- [x] PR lifecycle unchanged: preview up on open, destroyed on close
- [x] Version lineage traceable: PR build `X.Y.{run}-pr.N` → main tag `X.Y.{run}` → prod publishes exactly `X.Y.{run}`

## Notes
- Tag-at-main (not compute-at-prod) chosen so the version is locked when the bump decision is made and survives any main→prod merge strategy (squash/merge both work — prod reads highest tag across all refs, same technique `_release.yml` already uses).
- If main advances again before prod merges, prod publishes the newest tag — correct, since the prod merge includes all of main.
- Existing npm idempotency check (`npm view name@version`) makes prod re-runs safe.
- Out of scope: changing preview URL scheme, CloudFront/S3 layout, `_verify.yml` internals.
