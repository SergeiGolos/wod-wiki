# Smoketests

These smoketests exercise the deployed production app (`https://wod.wiki`) and the Chromecast receiver workflow via Storybook. They run from `playwright.smoke.config.ts` in serial mode (`fullyParallel: false`, one worker). In CI they hit `wod.wiki` and `storybook.wod.wiki`; locally the config starts the Vite dev app and dev Storybook automatically unless `E2E_APP_URL` or `E2E_STORYBOOK_URL` override the targets.

## How this group runs

- **Config:** `playwright.smoke.config.ts` — `bun x playwright test --config playwright.smoke.config.ts` (collects `e2e/smoke/**/*.smoke.e2e.ts` only; serial, one worker, one retry).
- **Runs against:** both projects — `production.smoke.e2e.ts` targets the **playground app** routes; `receiver-workflow.smoke.e2e.ts` targets **Storybook** (`*-chromecast` stories plus the `receiver-rpc.html` entry point served by Storybook).
- **Dev (local):** the config auto-starts the playground app (`bun run dev:app` on :5173) and Storybook (`bun run storybook` on :6006), reusing running instances.
- **CI/CD:** runs in the release pipeline — `.github/workflows/main.yml` (push to `main`) → `_verify.yml` → `_release.yml`, which deploys the playground to GitHub Pages and then executes this config in the "Run production smoke tests" step with `CI: true`, so targets resolve to `https://wod.wiki` and `https://storybook.wod.wiki` with no local servers. Report artifact: `playwright-report/smoke/`.

## `e2e/smoke/production.smoke.e2e.ts`

App-level production smoke tests against `appBaseURL()`.

### `App Smoketests — ${appBaseURL()}`
Shared setup: none; each test navigates directly to a route.

#### `homepage loads and renders title`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:5`
- **Target:** `/`
- **Actions:** goto homepage → wait `domcontentloaded` → locate first `#root` or `body > div` → read page title → screenshot `e2e/screenshots/smoke-homepage.png`
- **Asserts:** app container visible; page title contains `Wod.Wiki`

#### `can navigate to journal page`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:20`
- **Target:** `/journal/<today>` (today’s ISO date)
- **Actions:** compute today’s date → goto `/journal/${today}` → wait 1s → locate contenteditable/textarea/editor, falling back to main content → screenshot `e2e/screenshots/smoke-journal.png`
- **Asserts:** editor or main content is visible

#### `no console errors on homepage`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:39`
- **Target:** `/`
- **Actions:** attach `pageerror` listener → goto homepage → wait `networkidle` → wait 2s → filter out extension/adblock/third-party errors
- **Asserts:** no critical page errors remain

#### `WOD index page loads`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:60`
- **Target:** `/wod`
- **Actions:** goto `/wod` → wait 1s → locate `main`, `[role="main"]`, or `#root` → screenshot `e2e/screenshots/smoke-wod-index.png`
- **Asserts:** main content is visible

#### `/efforts loads without critical page errors`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:95`
- **Target:** `/efforts`
- **Actions:** attach `pageerror` listener → goto `/efforts` → wait 2s → filter extension/adblock/third-party noise → screenshot `e2e/screenshots/smoke-efforts.png`
- **Asserts:** main content visible; no critical page errors

#### `/collections loads without critical page errors`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:100`
- **Target:** `/collections`
- **Asserts:** main content visible; no critical page errors

#### `/syntax/basics redirects and renders without critical page errors`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:105`
- **Target:** `/syntax/basics` → `/guide/syntax/basics`
- **Asserts:** main content visible (post-redirect); no critical page errors

#### `Fran collection workout starts and mounts the timer overlay`
- **Location:** `e2e/smoke/production.smoke.e2e.ts:112`
- **Target:** `/workout/crossfit-girls/fran` → `/collections/crossfit-girls/fran` → `/run/:runtimeId`
- **Actions:** suppress First-Note Wizard; goto the Fran workout (via `WorkoutEditorPage`); assert prose contains `Fran`; DOM-click the `Play` control; wait for the timer overlay.
- **Asserts:** `button[title="Close"]` visible (FocusedDialog mounted); workout session started

## `e2e/smoke/receiver-workflow.smoke.e2e.ts`

WOD-647 — E2E Smoke: Receiver Workflow. Verifies the Chromecast receiver entry point loads without crashing, then exercises waiting, preview, active, and review states through Storybook Chromecast stories.

### `Receiver — Entry Point`
Shared setup: none.

#### `receiver-rpc.html loads without JavaScript crashes`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:37`
- **Target:** `${STORYBOOK_BASE}/receiver-rpc.html`
- **Actions:** goto receiver-rpc.html → wait `domcontentloaded` → locate `#root` → assert `Wod.Wiki` text visible → screenshot `e2e/screenshots/smoke-receiver-entry.png`
- **Asserts:** root container mounts within 5s; `Wod.Wiki` branding visible

#### `no critical console errors on receiver page`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:50`
- **Target:** `${STORYBOOK_BASE}/receiver-rpc.html`
- **Actions:** attach `pageerror` listener → goto receiver-rpc.html → wait `networkidle` → wait 2s → filter out extension/adblock/third-party/Cast errors
- **Asserts:** no critical page errors remain

### `Receiver — Waiting Screen`
Shared setup: none.

#### `waiting state renders pulsing splash`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:75`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait `networkidle` → assert `waiting-for-cast` text visible → check `animate-pulse` class on status text → screenshot `e2e/screenshots/smoke-receiver-waiting.png`
- **Asserts:** waiting text visible; status text has `animate-pulse` class

### `Receiver — Preview Screen`
Shared setup: none.

#### `preview state renders title and block list`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:96`
- **Target:** `catalog-templates-tracker-chromecast--preview`
- **Actions:** goto story URL → wait `networkidle` → assert `Fran` and `Select a workout to begin` visible → count focusable/rounded block items → screenshot `e2e/screenshots/smoke-receiver-preview.png`
- **Asserts:** title and prompt visible; ≥3 block items

#### `preview blocks have spatial navigation data attributes`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:111`
- **Target:** `catalog-templates-tracker-chromecast--preview`
- **Actions:** goto story URL → wait `networkidle` → locate `[data-nav-id="preview-block-0"]`
- **Asserts:** first preview block is visible

### `Receiver — Active Screen`
Shared setup: none.

#### `active Fran renders stack and timer panels`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:124`
- **Target:** `catalog-templates-tracker-chromecast--active-fran`
- **Actions:** goto story URL → wait `networkidle` → assert `Thruster` visible → locate timer panel by class → locate flex container and read `display` → screenshot `e2e/screenshots/smoke-receiver-active-fran.png`
- **Asserts:** `Thruster` visible; timer panel visible; `display === 'flex'`

#### `active AMRAP renders countdown and rounds`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:146`
- **Target:** `catalog-templates-tracker-chromecast--active-amrap`
- **Actions:** goto story URL → wait `networkidle` → assert `Cindy` visible → screenshot `e2e/screenshots/smoke-receiver-active-amrap.png`
- **Asserts:** `Cindy` visible

#### `active EMOM renders interval timer`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:155`
- **Target:** `catalog-templates-tracker-chromecast--active-emom`
- **Actions:** goto story URL → wait `networkidle` → assert `EMOM 10` visible → screenshot `e2e/screenshots/smoke-receiver-active-emom.png`
- **Asserts:** `EMOM 10` visible

### `Receiver — Review Screen`
Shared setup: none.

#### `review with projections renders metric cards`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:169`
- **Target:** `catalog-templates-review-chromecast--with-projections`
- **Actions:** goto story URL → wait `networkidle` → assert `Workout Complete` and `Total Reps` visible → screenshot `e2e/screenshots/smoke-receiver-review-projections.png`
- **Asserts:** header and `Total Reps` visible

#### `review dismiss button is focusable`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:179`
- **Target:** `catalog-templates-review-chromecast--dismiss-button-focused`
- **Actions:** goto story URL → wait `networkidle` → locate `[data-nav-id="btn-dismiss"]` → read `data-nav-focused` attribute → screenshot `e2e/screenshots/smoke-receiver-review-dismiss-focused.png`
- **Asserts:** button visible; `data-nav-focused === 'true'`

#### `empty review shows defensive state`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:194`
- **Target:** `catalog-templates-review-chromecast--empty-review`
- **Actions:** goto story URL → wait `networkidle` → assert `Workout Complete` and `0 segments completed` visible
- **Asserts:** defensive copy visible; page does not crash

### `Receiver — Cross-Mode Health`
Shared setup: none.

#### `no console errors across tracker chromecast stories`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:208`
- **Target:** tracker Chromecast stories: `idle`, `preview`, `ready-to-start`, `active-fran`, `active-amrap`, `paused-state`
- **Actions:** attach `pageerror` listener → for each state, goto story URL and wait 500ms → filter out extension/adblock/third-party errors
- **Asserts:** no critical errors across all tracker states

#### `review chromecast stories load without errors`
- **Location:** `e2e/smoke/receiver-workflow.smoke.e2e.ts:239`
- **Target:** review Chromecast stories: `simple-rows`, `with-projections`, `fran-results`, `empty-review`
- **Actions:** attach `pageerror` listener → for each story, goto URL → assert `Workout Complete` visible → wait 500ms → filter out extension/adblock/third-party errors
- **Asserts:** header visible in every review story; no critical errors
