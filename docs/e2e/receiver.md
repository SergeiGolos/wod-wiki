# Chromecast/TV Receiver Storybook Specs

These specs load Chromecast receiver panels inside Storybook stories to verify TV layout, focus states, and visual stability across waiting, preview, active, and review modes. They run from `playwright.config.ts` against the local Storybook dev server (`https://localhost:6006`), with `E2E_STORYBOOK_URL` overriding the target in CI.

## How this group runs

- **Config:** `playwright.config.ts` — `bun run test:e2e` (same main config as the acceptance specs; `live-app/**` and `smoke/**` are ignored).
- **Runs against:** **Storybook** — the receiver panel stories (`catalog-templates-tracker-chromecast--*`, `catalog-templates-review-chromecast--*`) rendered in iframes. Locally the dev server (`bun run storybook`) is auto-started at `https://localhost:6006`; visual baselines live in `*.e2e.ts-snapshots/` beside each spec.
- **CI/CD:** not wired into any GitHub workflow — local/pre-merge only. With `CI` set or `E2E_STORYBOOK_URL` exported, tests target `https://storybook.wod.wiki` and no local server is started.

## `e2e/receiver-layout-verification.e2e.ts`

WOD-642 — Receiver Layout Polish & Edge Cases. Browser-level verification of all four receiver modes plus empty-review, reconnection, and cross-mode button focus states.

### `Receiver — Waiting Screen`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `text is centered and pulsing animation is present`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:36`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait networkidle → take screenshot `receiver-waiting-screen.png` → locate `Wod.Wiki` text → read parent `justifyContent` → check text element class list for `animate-pulse`
- **Asserts:** screenshot matches baseline; `justifyContent === 'center'`; element has `animate-pulse` class

#### `connection status text updates correctly`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:62`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait networkidle → locate text matching `/waiting-for-cast/i`
- **Asserts:** status text is visible

### `Receiver — Preview Screen`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `layout renders title, block list, and ready indicator`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:75`
- **Target:** `catalog-templates-tracker-chromecast--preview`
- **Actions:** goto story URL → wait networkidle → assert `text=Fran` and `text=Select a workout to begin` visible → count focusable/rounded block items → take screenshot `receiver-preview-screen.png`
- **Asserts:** `Fran` and `Select a workout to begin` visible; ≥3 block items; screenshot matches baseline

#### `spatial navigation focusable items have data-nav-id`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:92`
- **Target:** `catalog-templates-review-chromecast--dismiss-button-focused`
- **Actions:** goto story URL → wait networkidle → locate `[data-nav-id="btn-dismiss"]`
- **Asserts:** element has attribute `data-nav-focused="true"`

#### `preview blocks show timer hints and dialect badges`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:104`
- **Target:** `catalog-templates-tracker-chromecast--preview`
- **Actions:** goto story URL → wait networkidle → locate list container by `Select a workout to begin` text
- **Asserts:** list container is visible

### `Receiver — Active / Idle Screen`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `Ready To Start layout is stable`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:119`
- **Target:** `catalog-templates-tracker-chromecast--ready-to-start`
- **Actions:** goto story URL → wait networkidle → locate heading `Ready to Start` → locate timer/stack panel by class
- **Asserts:** heading visible; timer panel visible

#### `Active Fran layout has stack and timer side-by-side`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:134`
- **Target:** `catalog-templates-tracker-chromecast--active-fran`
- **Actions:** goto story URL → wait networkidle → locate first `div[class*="flex"][class*="overflow-hidden"]` → read its `display` style
- **Asserts:** flex container visible; `display === 'flex'`

#### `Active AMRAP layout is stable`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:150`
- **Target:** `catalog-templates-tracker-chromecast--active-amrap`
- **Actions:** goto story URL → wait networkidle → locate first `Cindy` text → locate flex container → read `display` style
- **Asserts:** `Cindy` visible; flex container visible; `display === 'flex'`

#### `Active EMOM layout is stable`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:166`
- **Target:** `catalog-templates-tracker-chromecast--active-emom`
- **Actions:** goto story URL → wait networkidle → locate first `EMOM 10` text → locate flex container → read `display` style
- **Asserts:** `EMOM 10` visible; flex container visible; `display === 'flex'`

### `Receiver — Review Screen`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `Review with projections renders metric cards`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:187`
- **Target:** `catalog-templates-review-chromecast--with-projections`
- **Actions:** goto story URL → wait networkidle → assert `Workout Complete` and `Total Reps` visible → take screenshot `receiver-review-projections.png`
- **Asserts:** `Workout Complete` and `Total Reps` visible; screenshot matches baseline

#### `Fran results render correctly`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:199`
- **Target:** `catalog-templates-review-chromecast--fran-results`
- **Actions:** goto story URL → wait networkidle → locate `7:23` and `Total Volume`
- **Asserts:** `7:23` visible; `Total Volume` visible

#### `Empty review shows defensive state`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:208`
- **Target:** `catalog-templates-review-chromecast--empty-review`
- **Actions:** goto story URL → wait networkidle → assert `Workout Complete` and `0 segments completed` visible
- **Asserts:** defensive copy visible; page does not crash

#### `Dismiss button is focusable with D-Pad`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:217`
- **Target:** `catalog-templates-review-chromecast--dismiss-button-focused`
- **Actions:** goto story URL → wait networkidle → locate `[data-nav-id="btn-dismiss"]` → read `data-nav-focused` attribute → take screenshot `receiver-review-dismiss-focused.png`
- **Asserts:** button visible; `data-nav-focused === 'true'`; screenshot matches baseline

### `Receiver — Edge Cases`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `button focus states are accessible across review modes`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:240`
- **Target:** `catalog-templates-review-chromecast--with-dismiss-button`
- **Actions:** goto story URL → wait networkidle → locate `[data-nav-id="btn-dismiss"]` → read `data-nav-focused` attribute
- **Asserts:** button visible; `data-nav-focused === 'false'`

#### `review screen does not duplicate metric values`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:254`
- **Target:** `catalog-templates-review-chromecast--with-projections`
- **Actions:** goto story URL → wait networkidle → count elements matching `Total Reps`
- **Asserts:** at least one `Total Reps` label exists and is not duplicated as a value

#### `light background variant renders without contrast issues`
- **Location:** `e2e/receiver-layout-verification.e2e.ts:266`
- **Target:** `catalog-templates-review-chromecast--light-background`
- **Actions:** goto story URL → wait networkidle → assert `Workout Complete` visible → take screenshot `receiver-review-light-bg.png`
- **Asserts:** header visible; screenshot matches baseline

## `e2e/receiver-tv-platform.e2e.ts`

WOD-735 — Chromecast & TV Platform Testing. Browser-level validation of TV-optimized rendering, focus indicators, and the standalone web TV receiver variant.

### `Receiver — TV Viewport (WOD-735)`
Shared setup: `test.use({ viewport: { width: 1920, height: 1080 } })` for all tests in this describe.

#### `waiting shell renders correctly at 1080p TV viewport`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:31`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait networkidle → take full-page screenshot `receiver-tv-waiting-1080p.png`
- **Asserts:** screenshot matches baseline

#### `active tracker layout is stable at 1080p TV viewport`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:41`
- **Target:** `catalog-templates-tracker-chromecast--active-fran`
- **Actions:** goto story URL → wait networkidle → locate first `div[class*="flex"][class*="overflow-hidden"]` → read `display` style
- **Asserts:** flex container visible; `display === 'flex'`

#### `review screen renders at 1080p with readable metrics`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:54`
- **Target:** `catalog-templates-review-chromecast--with-projections`
- **Actions:** goto story URL → wait networkidle → assert `Workout Complete` and `Total Reps` visible
- **Asserts:** header and metric label visible

### `Receiver — Focus Indicators (WOD-735)`
Shared setup: none beyond `goto(storyUrl(...))` and `waitForLoadState('networkidle')`.

#### `dismiss button focus shows D-Pad focus ring`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:67`
- **Target:** `catalog-templates-review-chromecast--dismiss-button-focused`
- **Actions:** goto story URL → wait networkidle → locate `[data-nav-id="btn-dismiss"]` → assert `data-nav-focused="true"` → read computed `boxShadow`
- **Asserts:** `data-nav-focused === 'true'`; `boxShadow !== 'none'`; shadow has ≥4 layers

### `Receiver — Web TV Variant / Standalone Mode (WOD-735)`
Shared setup: `test.use({ viewport: { width: 1920, height: 1080 } })` for all tests in this describe.

#### `standalone waiting shell renders without CAF`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:90`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait networkidle → assert `Wod.Wiki` and `waiting-for-cast` visible → attach console error listener → wait 500ms
- **Asserts:** branding and status text visible; no console errors containing `cast` or `CAF`

#### `standalone shell text is centered and readable at TV distance`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:108`
- **Target:** `catalog-templates-tracker-chromecast--idle`
- **Actions:** goto story URL → wait networkidle → locate `waiting-for-cast` text → read `fontSize` and parent `justifyContent`
- **Asserts:** text visible; `fontSize >= 16px`; parent `justifyContent === 'center'`

#### `web TV variant has no horizontal overflow at 1080p`
- **Location:** `e2e/receiver-tv-platform.e2e.ts:129`
- **Target:** `catalog-templates-tracker-chromecast--active-amrap`
- **Actions:** goto story URL → wait networkidle → evaluate `document.documentElement.scrollWidth` and `window.innerWidth`
- **Asserts:** `scrollWidth <= innerWidth + 20`
