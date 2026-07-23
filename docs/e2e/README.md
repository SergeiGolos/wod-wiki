# E2E Test Outlines

Per-test outlines of every Playwright spec in `e2e/`, grouped by logical testing area. Each test is documented with its **Location** (file:line), **Target** (story/route), **Actions**, and **Asserts**.

## Groups

| Doc | Group | Specs | Tests | Config | Target |
|---|---|---|---|---|---|
| [acceptance.md](acceptance.md) | Storybook acceptance | 6 | 49 | `playwright.config.ts` | Storybook stories (iframe) |
| [receiver.md](receiver.md) | Chromecast/TV receiver | 2 | 23 | `playwright.config.ts` | Storybook stories (iframe) |
| [smoke.md](smoke.md) | Smoketests | 2 | 17 | `playwright.smoke.config.ts` | App + Storybook + receiver entry |
| [live-app.md](live-app.md) | Live app / journal | 21 | 90 | `playwright.journal.config.ts` | Vite dev app routes |

## How to run

```bash
# Main suite (acceptance + receiver) — 72 tests
bun run test:e2e                                    # = bun x playwright test

# Live app (journal, widgets, efforts) — 90 tests
bun run test:e2e:journal                            # = bun x playwright test --config playwright.journal.config.ts

# Smoketests — 17 tests
bun x playwright test --config playwright.smoke.config.ts

# Preview deploy (widget block preview only)
bun x playwright test --config playwright.preview.config.ts
```

## Target resolution (local vs CI)

Base URLs resolve via `e2e/utils/url-helpers.ts`:

| | Local | CI (`CI` set) | Override |
|---|---|---|---|
| Storybook | `https://localhost:6006` (protocol from `HTTPS_CERT`) | `https://storybook.wod.wiki` | `E2E_STORYBOOK_URL` |
| App | `https://<HTTPS_HOST>:5173` or `http://localhost:5173` | `https://wod.wiki` | `E2E_APP_URL` |

- `playwright.config.ts` and `playwright.smoke.config.ts` start local servers automatically (`reuseExistingServer: true`); in CI no servers are started and deployed targets are used.
- The main config ignores `e2e/live-app/**` (journal config's job) and `e2e/smoke/**` (smoke config's job).

## When tests run (dev & CI/CD)

| Workflow | Trigger | Playwright e2e | Target |
|---|---|---|---|
| `pull-request.yml` → `_verify.yml` | PR opened/synchronize/reopened | **Live-app** — `playwright.journal.config.ts` (Vite dev app, `workers: 1`); plus unit, story (vitest), coverage, build | local playground app :5173 (CI starts the dev server) |
| `main.yml` → `_release.yml` | push to `main` (after GitHub Pages deploy) | **Smoke** — `playwright.smoke.config.ts` (`CI: true`) | `https://wod.wiki` + `https://storybook.wod.wiki` |
| `preview-deploy.yml` → `preview-e2e.yml` | PR opened/synchronize (after S3 + CloudFront deploy) | **Preview** — `playwright.preview.config.ts` (widget-block-preview spec only, 3 browsers) | `https://<branch-slug>.preview.wod.wiki`; HTML report published to `s3://<bucket>/<slug>/e2e-report/` and linked in the PR comment |
| — (local dev) | `bun run test:e2e` | **Main** — acceptance + receiver (72 tests) | local Storybook :6006 |
| — (local dev) | `bun run test:e2e:journal` | **Live-app** (90 tests) | local playground app :5173 |

> The journal config runs in PR CI (`_verify.yml` → `e2e` job) and locally/pre-merge; the main Storybook config remains local-only. Setting `CI` or the `E2E_*_URL` vars retargets them at the deployed surfaces without code changes. `preview-e2e.yml` can also still be run manually via `workflow_dispatch` against an arbitrary `preview-url`.
>
> All configs capture a screenshot for **every** test (`screenshot: 'on'`), embedded in the HTML report (`bun x playwright show-report` after a run).

## Notes

- Page objects: `e2e/pages/` (e.g. `EffortDetailPage.ts`, `ReviewPage.ts`, `WorkoutEditorPage.ts`); helpers: `e2e/utils/`, `e2e/helpers/`.
- Visual baselines live beside their specs (`*.e2e.ts-snapshots/`); regenerate with `--update-snapshots` only after confirming a diff is intended.
