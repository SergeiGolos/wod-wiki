# Preview Deployment Acceptance Criteria

This document defines the acceptance criteria, validation steps, and sign-off procedures for preview deployments in the wod-wiki delivery workflow.

---

## Overview

Preview deployments publish the wod-wiki playground to a live URL so that testers and reviewers can validate changes before they reach production.

| Surface | URL | Triggered by |
| --- | --- | --- |
| Playground (preview) | `https://preview.wod.wiki/` | Push to `dev`, manual dispatch |
| Storybook (preview) | `https://storybook.wod.wiki/` | Push to `dev`, manual dispatch |
| Production | `https://wod.wiki/` | Push to `main` |

---

## Trigger Conditions

### Automatic — push to `dev`

The `dev.yml` workflow fires on every push to the `dev` branch:

1. Runs the full **Verify** suite (unit tests, story tests, coverage, playground build).
2. If Verify passes, dispatches `_preview-delivery.yml` to build and deploy the playground.
3. Simultaneously dispatches the Storybook preview (non-blocking — failure is a warning).

### Manual dispatch

```bash
# Trigger a preview for any branch via the GitHub CLI
gh workflow run dev.yml -f branch=feature/my-branch
```

Or from the Actions tab: **Delivery – Dev Preview → Run workflow → enter branch**.

---

## Pre-Deployment Gate (Verify)

The preview deployment is **gated** on the Verify workflow (`_verify.yml`). Verify must fully pass before `_preview-delivery.yml` is invoked.

| Check | Command | Required |
| --- | --- | --- |
| Unit tests | `bun run test` | ✅ Yes |
| Story tests | `bun run test:storybook` | ✅ Yes |
| Coverage | `bun run test:coverage` | ✅ Yes |
| Playground build | `bun run build:app` | ✅ Yes |

If any required check fails, the preview delivery job is skipped.

---

## Deployment Readiness Criteria

A preview deployment is considered **ready** when all of the following are true:

### 1. Playground is reachable

- `GET https://preview.wod.wiki/playground` returns HTTP 200.
- The deployment pipeline polls this route (up to 20 × 15 s = 5 minutes) and fails the run if the route never becomes healthy.

### 2. Playground boots without error

- The page loads to `domcontentloaded` without a JavaScript crash.
- No `flushSync was called from inside a lifecycle method` console warnings are emitted.

### 3. Landing widgets render correctly

- The attention widget headline **"Build and preview widget-driven workout pages."** is visible.
- The code example widget heading and **"Run this example"** CTA are visible.
- Exactly 3 syntax-group cards are visible with **Docs** buttons.
- Clicking **Jump to workout** scrolls the viewport to `#workout-widget-surface`.

### 4. Responsive layout is intact

Tests run on both viewports and assert no horizontal overflow:

| Viewport | Dimensions |
| --- | --- |
| Desktop | 1440 × 900 |
| Mobile | 375 × 812 |

### 5. No regressions in the automated E2E suite

The preview E2E Playwright suite (`playwright.preview.config.ts`) must pass with zero failures across Chromium, Firefox, and WebKit.

```bash
# Run locally against a live preview URL
PLAYWRIGHT_BASE_URL=https://preview.wod.wiki \
  bun x playwright test --config playwright.preview.config.ts
```

---

## Automated Acceptance Checks

The `preview-e2e.yml` workflow runs the Playwright suite against the deployed URL:

```yaml
# Triggered automatically after preview-delivery or manually
gh workflow run preview-e2e.yml -f preview-url=https://preview.wod.wiki
```

**Outputs collected:**

- HTML report uploaded as `preview-playwright-report` artifact (14-day retention).
- Screenshots and videos on failure uploaded as `preview-e2e-screenshots` artifact.
- JUnit XML report at `test-results/preview-e2e-junit.xml`.
- GitHub step summary with test counts, failure counts, and skipped counts.

---

## Manual Validation Steps

When automated checks are green, a reviewer performs the following manual checks:

### Smoke Check (required for every preview)

1. Open `https://preview.wod.wiki/playground` in Chrome.
2. Verify the page title and app header load without a blank screen.
3. Type a simple workout script in the editor (e.g., `3x 10 Pushups`) and confirm the parser renders live output without errors.
4. Resize the browser to a mobile width (375 px) and confirm the layout does not break.

### Widget Validation (required when landing widget code changed)

1. Navigate to `/playground`.
2. Confirm the attention hero, code example, and 3 syntax cards are visible.
3. Click **Jump to workout** and verify the workout widget section is scrolled into view.
4. Click **Run this example** and verify navigation to `/playground/:id` works.

### Storybook Spot-Check (required when component stories changed)

1. Open `https://storybook.wod.wiki/` (dispatched non-blocking alongside the playground preview).
2. Navigate to the stories affected by the PR.
3. Confirm each story renders without error.

---

## Sign-Off Procedure

| Step | Owner | Action |
| --- | --- | --- |
| Automated gate passes | CI | Verify workflow green; preview-e2e green |
| Smoke check complete | Reviewer | Confirm all manual steps above are done |
| Approval comment | Reviewer | Post "✅ Preview accepted — [PR link]" in the PR or issue thread |
| Merge unblocked | Engineer | Merge to `dev` (already deployed); proceed to `main` release when ready |

> **No manual sign-off is required** when:
> - The PR only touches documentation, test files, or tooling (no playground or library source changes).
> - The automated preview-e2e suite is green and the change is low-risk.
>
> In those cases, the CI green status is sufficient. Use judgment — escalate to the CTO if uncertain.

---

## Failure Handling

| Failure | Action |
| --- | --- |
| Verify fails (unit/story/build) | Fix the failing check; do not re-trigger preview until green |
| Preview URL never becomes HTTP 200 | Check `wod-wiki-preview` Actions tab for the companion deployment run; inspect build logs |
| Preview E2E fails | Review the `preview-playwright-report` artifact; fix regression before marking the PR ready |
| Widget block not visible | Likely a CodeMirror decoration registration failure; check browser console for errors |
| Storybook preview fails (non-blocking) | File a follow-up issue; does not block playground preview acceptance |

---

## Environment Reference

| Variable / Secret | Where | Purpose |
| --- | --- | --- |
| `PREVIEW_REPO_PAT` | `wod-wiki` repo secret | GitHub PAT to dispatch `wod-wiki-preview` workflows |
| `PLAYWRIGHT_BASE_URL` | CI env / local | Override preview base URL for E2E |
| `VITE_API_URL` | `wod-wiki` repo var | API base injected at build time |
| `VITE_CAST_APP_ID` | `wod-wiki` repo var | Cast app ID injected at build time |
| `G_TAG` | `wod-wiki` repo var | Google Analytics tag injected at build time |

---

## Related Files

| File | Purpose |
| --- | --- |
| `.github/workflows/dev.yml` | Delivery – Dev Preview trigger |
| `.github/workflows/_preview-delivery.yml` | Dispatches and waits for companion preview repo |
| `.github/workflows/preview-e2e.yml` | Runs Playwright against live preview URL |
| `.github/workflows/_verify.yml` | Pre-deployment verification gate |
| `playwright.preview.config.ts` | Playwright config scoped to preview acceptance tests |
| `e2e/live-app/playground-widget-block-preview.e2e.ts` | Automated acceptance test for landing widget rendering, responsiveness, and FPS budget |
| `https://github.com/SergeiGolos/wod-wiki-preview` | Companion repo that builds and hosts the preview |
