# Testing Architecture — Three-Tier Plan

**Date**: 2026-05-08 | **Status**: Architecture Plan | **Scope**: Unit, Integration, and E2E test tiers

---

## Target Architecture

Three tiers, three runners, three targets. Each tier has a distinct purpose, a distinct runner, and a distinct command. No tier leaks into another.

```
┌──────────────────────────────────────────────────────────────────┐
│  Tier 1 — Unit Tests                                             │
│  Runner: bun                                                     │
│  Target: source modules in isolation                             │
│  Files:  src/**/*.test.ts   tests/**/*.test.ts                   │
│  Command: bun run test                                           │
├──────────────────────────────────────────────────────────────────┤
│  Tier 2 — Integration Tests                                      │
│  Runner: Playwright                                              │
│  Target: Storybook at localhost:6006                             │
│  Files:  e2e/integration/**/*.e2e.ts                             │
│  Command: bun run test:integration                               │
├──────────────────────────────────────────────────────────────────┤
│  Tier 3 — E2E Tests                                              │
│  Runner: Playwright                                              │
│  Target: Playground app — localhost or deployed URL              │
│  Files:  e2e/playground/**/*.e2e.ts                              │
│  Command: bun run test:e2e                                       │
│  Config:  E2E_BASE_URL=https://app.wod.wiki bun run test:e2e     │
└──────────────────────────────────────────────────────────────────┘
```

### What Each Tier Tests

**Tier 1 — Unit** answers: _Does this module do what it claims in isolation?_
- Parser produces the right `CodeStatement` tree
- JIT strategies compile the correct `IRuntimeBlock`
- Behaviors respond correctly to lifecycle events
- Memory allocations and reads work as specified

**Tier 2 — Integration** answers: _Do components behave correctly when composed in a real browser?_
- Does a CrossFit benchmark workout execute through all blocks correctly?
- Does the comment vs action item distinction render correctly?
- Does closing the FullscreenTimer overlay work promptly?
- Does the metric panel appear in the right position when the cursor focuses a line?

**Tier 3 — E2E** answers: _Does the full app work for a real user at the route level?_
- Can a user navigate from Collections → workout → editor?
- Does journal entry content survive a page reload?
- Does the play button in the WOD index launch a runtime session?
- Does the JournalDateScroll render in descending date order?

---

## Current State — What Exists Today

### Tier 1 — Unit Tests ✅ Well Established

| Command | Runner | Files | Notes |
|---------|--------|-------|-------|
| `bun run test` | bun | `src/**/*.test.ts` | Source-adjacent unit tests |
| `bun run test:components` | bun | `tests/**/*.test.ts` | Harness-based integration tests |
| `bun run test:all` | bun | Both | Combined run |

**Infrastructure**: `BehaviorTestHarness`, `MockBlock`, `RuntimeTestBuilder` in `tests/harness/`.
This tier is healthy. No structural changes needed.

---

### Tier 2 — Integration Tests ⚠️ Split Across Two Mechanisms

Currently served by **two separate mechanisms** that don't align:

#### Mechanism A — `bun run test:storybook` (vitest + @storybook/addon-vitest)

```
Config:   vitest.storybook.config.js
Runner:   vitest with Playwright browser provider (headless Chromium)
Target:   stories/**/*.stories.tsx — executes play() functions in-browser
```

**Status**: Configured, but **all stories lack `play()` functions**. This runner exists and works but has zero tests to run. It's ready infrastructure waiting for interaction tests to be written.

#### Mechanism B — `bun run test:e2e` (Playwright against Storybook)

```
Config:   playwright.config.ts
Runner:   Playwright
Target:   Storybook at localhost:6006 (iframe URLs)
Files:    e2e/acceptance/**/*.e2e.ts
          (e2e/acceptance/history-panel-navigation.e2e.ts excluded)
```

**Status**: Partially working. Four acceptance tests run. One excluded (missing story). Storybook is launched as a webServer dependency.

**Files in `e2e/acceptance/`**:

| File | Target Story | Status |
|------|-------------|--------|
| `comment-vs-action-item.e2e.ts` | `catalog-molecules-metrics-metricvisualizer--comment-vs-action-item` | ✅ Running |
| `cursor-focus-panel.e2e.ts` | `catalog-pages-planner--note-editor-default` | ✅ Running |
| `fullscreen-timer-close.e2e.ts` | `catalog-organisms-fullscreentimer--simple-timer` | ✅ Running |
| `home-feature-card-markdown.e2e.ts` | `catalog-pages-homeview--default` | ✅ Running |
| `crossfit-benchmarks.e2e.ts` | `acceptance-runtimecrossfit--{fran,annie,cindy,barbara}` | ⚠️ Click-counting only |
| `history-panel-navigation.e2e.ts` | `notebook--default` | ❌ Excluded — story missing |

---

### Tier 3 — E2E Tests ⚠️ Working but Split Across Two Configs

Currently served by **two overlapping configs**:

#### `playwright.journal.config.ts` → `bun run test:e2e:journal`

```
Target:   localhost:5173 or https://${HTTPS_HOST}:5173
Files:    e2e/live-app/**/*.e2e.ts
Workers:  1 (scroll tests are order-sensitive)
```

Primary E2E config. Supports Tailscale via `HTTPS_HOST` env var. Works correctly.

#### `playwright.repro.config.ts` (no npm script — manual use only)

```
Target:   localhost:5173 or https://${HTTPS_HOST}:5173
Files:    e2e/**/*.e2e.ts  (excluding acceptance/ and storybook/)
Workers:  default
```

Debug/repro config. Used for manual investigation. No CI integration.

**Files in `e2e/live-app/`**:

| File | Route | Status |
|------|-------|--------|
| `canvas-editor-frontmatter.e2e.ts` | `/syntax/basics` | ✅ Working |
| `dead-click-handlers.e2e.ts` | `/collections`, `/workout/:id` | ✅ Working |
| `journal-entry.e2e.ts` | `/journal/:date` | ✅ Working |
| `journal-scroll.e2e.ts` | `/journal` | ✅ Working |
| `playground-widget-block-preview.e2e.ts` | `/playground` | ✅ Working |
| `wod-index-play-button.e2e.ts` | `/journal/:date` | ✅ Working |

---

## Gap Analysis

### Tier 2 — Integration

| Gap | Impact |
|-----|--------|
| Storybook tests (`vitest.storybook.config.js`) have no `play()` functions to run | Tier 2A is empty; CI can't use it |
| `crossfit-benchmarks.e2e.ts` clicks through workouts but can't assert runtime state | Core workout execution is untested at the state level |
| `history-panel-navigation.e2e.ts` excluded — no `notebook--default` story | History navigation is untested |
| Page objects (`JitCompilerDemoPage`, `WorkbenchPage`) target non-existent story IDs | Dead code; developers may try to use them |
| `runtime-helpers.ts` `extractRuntimeState()` is broken — calls Node.js functions from browser context | All `RuntimeAssertions` and `WorkoutAssertions` are dead code |
| `fixtures/workout-data.ts` defines 12 workouts with `validationSteps[]` but no executor uses them | Rich specification is orphaned |

### Tier 3 — E2E

| Gap | Impact |
|-----|--------|
| Two overlapping configs (`journal`, `repro`) with no clear purpose distinction | Confusing; `repro` is effectively `journal` with different scope |
| No support for a `E2E_BASE_URL` override pointing at a deployed environment | Can only test localhost or Tailscale host |
| `bun run test:e2e` runs Storybook tests, not playground tests (wrong tier name) | Misleading command names |
| No CI script for running Tier 3 on a deployed URL | Deployment smoke tests require manual invocation |

### Naming Confusion

| Current command | What it actually runs | What the name implies |
|----------------|----------------------|----------------------|
| `bun run test:e2e` | Playwright against **Storybook** (Tier 2) | Playwright against the app (Tier 3) |
| `bun run test:e2e:journal` | Playwright against **playground app** (Tier 3) | Just the journal feature |
| `bun run test:storybook` | Vitest play() functions (Tier 2A) | Same thing as test:e2e? |

The command names do not match the tier model. A developer working from the three-tier mental model will run `test:e2e` expecting to hit the playground, and instead hit Storybook.

---

## Target State — Concrete Changes

### Directory Restructure

```
e2e/
├── integration/                    ← was acceptance/
│   ├── comment-vs-action-item.e2e.ts
│   ├── crossfit-benchmarks.e2e.ts
│   ├── cursor-focus-panel.e2e.ts
│   ├── fullscreen-timer-close.e2e.ts
│   ├── history-panel-navigation.e2e.ts  (unblocked after story is created)
│   └── home-feature-card-markdown.e2e.ts
├── playground/                     ← was live-app/
│   ├── canvas-editor-frontmatter.e2e.ts
│   ├── dead-click-handlers.e2e.ts
│   ├── journal-entry.e2e.ts
│   ├── journal-scroll.e2e.ts
│   ├── playground-widget-block-preview.e2e.ts
│   └── wod-index-play-button.e2e.ts
├── pages/
│   ├── WorkbenchPage.ts             ← merged + fixed (was JitCompilerDemoPage + WorkbenchPage)
│   ├── JournalEntryPage.ts
│   └── JournalPage.ts
├── utils/
│   ├── assertion-helpers.ts
│   └── runtime-helpers.ts           ← fixed (see Opportunity 1 below)
├── fixtures/
│   └── workout-data.ts
└── contracts/
    └── TestIdContract.ts
```

### Config Restructure

Three configs, one per tier:

#### `playwright.integration.config.ts` — Tier 2

```typescript
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

const protocol = process.env.HTTPS_CERT ? 'https' : 'http';
const baseURL = `${protocol}://localhost:6006`;

export default defineConfig({
  testDir: './e2e/integration',
  testMatch: '**/*.e2e.ts',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/integration-junit.xml' }], ['github']]
    : 'html',
  use: {
    baseURL,
    ignoreHTTPSErrors: !!process.env.HTTPS_CERT,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run storybook',
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
```

#### `playwright.e2e.config.ts` — Tier 3

Replaces both `playwright.journal.config.ts` and `playwright.repro.config.ts`.

Key addition: `E2E_BASE_URL` env var for targeting a deployed environment directly.

```typescript
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

// Priority: E2E_BASE_URL (explicit) → HTTPS_HOST (Tailscale) → localhost
const baseURL =
  process.env.E2E_BASE_URL ??
  (process.env.HTTPS_HOST
    ? `https://${process.env.HTTPS_HOST}:5173`
    : 'http://localhost:5173');

const isRemote = !!process.env.E2E_BASE_URL || !!process.env.HTTPS_HOST;

export default defineConfig({
  testDir: './e2e/playground',
  testMatch: '**/*.e2e.ts',
  timeout: 45 * 1000,
  fullyParallel: false, // scroll tests are order-sensitive
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }], ['github']]
    : 'html',
  use: {
    baseURL,
    ignoreHTTPSErrors: isRemote,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start a local server when no remote URL is configured
  webServer: isRemote ? undefined : {
    command: 'bun run dev:app',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
```

**Env var usage:**

| Command | Target |
|---------|--------|
| `bun run test:e2e` | `http://localhost:5173` (starts dev server automatically) |
| `HTTPS_HOST=pluto.forest-adhara.ts.net bun run test:e2e` | `https://pluto.forest-adhara.ts.net:5173` (no server start) |
| `E2E_BASE_URL=https://app.wod.wiki bun run test:e2e` | `https://app.wod.wiki` (no server start) |

#### `playwright.config.ts` — Aggregate (optional)

Can remain as a thin aggregate running both tiers together:

```typescript
import { defineConfig } from '@playwright/test';

// This config delegates to the tier-specific configs.
// Use it for full local validation before merging.
// CI runs each tier separately via its own config.
export default defineConfig({
  projects: [
    {
      name: 'integration',
      testDir: './e2e/integration',
      testMatch: '**/*.e2e.ts',
      use: { baseURL: 'http://localhost:6006' },
    },
    {
      name: 'playground',
      testDir: './e2e/playground',
      testMatch: '**/*.e2e.ts',
      use: { baseURL: 'http://localhost:5173' },
    },
  ],
});
```

### `package.json` Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `bun test src --preload ./tests/unit-setup.ts` | Tier 1 — unit tests |
| `test:components` | `bun test tests --preload ./tests/setup.ts` | Tier 1 — harness-based tests |
| `test:all` | `bun run test && bun run test:components` | Tier 1 — full unit suite |
| `test:stories` | `bunx vitest run --config vitest.storybook.config.js` | Tier 2A — story play() functions |
| `test:integration` | `bun x playwright test --config playwright.integration.config.ts` | Tier 2B — Storybook playwright |
| `test:e2e` | `bun x playwright test --config playwright.e2e.config.ts` | Tier 3 — playground app |
| `test:e2e:ci` | `CI=1 bun run test:e2e` | Tier 3 — CI mode (retries, junit) |

**Removed scripts:**
- `test:e2e:journal` → replaced by `test:e2e` (same behavior, correct name)
- `test:ui` → remove or rename to `test:stories` (currently runs Storybook tests + e2e which is the wrong combination)

---

## Deepening Opportunities (Reframed by Tier)

### Tier 2 — Integration: Fix Runtime State Extraction

**Files**: `e2e/utils/runtime-helpers.ts`, `StorybookWorkbench`, Tracker/Review display panels

**Problem**: `extractRuntimeState(page)` silently returns empty data. It calls Node.js functions from inside `page.evaluate()` — they don't exist in the browser context. The entire `RuntimeAssertions` and `WorkoutAssertions` API is dead code as a result.

Secondary: even with a working browser context, the scraping targets CSS classes (`[data-testid="runtime-stack"]`, `.runtime-block`, `.memory-entry`) that components don't emit. The `TestIdContract.ts` exists but isn't applied to the runtime display components.

**Fix** (two parts):

**Part 1 — Instrument components:**

Add `data-testid` attributes in `StorybookWorkbench` and the block display components:
```tsx
// Runtime stack container
<div data-testid="runtime-stack" data-stack-depth={blocks.length}>
  {blocks.map((block, i) => (
    <div
      key={block.key}
      data-testid="runtime-block"
      data-block-type={block.blockType}
      data-block-key={block.key}
      data-depth={block.depth}
      data-active={i === currentIndex}
    >
      {/* metrics */}
      <span data-testid="block-metric" data-metric-type="reps" data-metric-value={block.reps}>
        {block.reps}
      </span>
    </div>
  ))}
</div>

// Memory visualization
<div data-testid="memory-state" data-total-allocated={entries.length}>
  {entries.map(entry => (
    <div
      key={entry.id}
      data-testid="memory-entry"
      data-memory-type={entry.type}
      data-owner-id={entry.ownerId}
      data-value={JSON.stringify(entry.value)}
    />
  ))}
</div>
```

**Part 2 — Rewrite browser context functions inline:**

```typescript
export async function extractRuntimeState(page: Page): Promise<RuntimeState> {
  return await page.evaluate(() => {
    // Functions must be defined INSIDE evaluate() to exist in browser context

    function extractStackState() {
      const container = document.querySelector('[data-testid="runtime-stack"]');
      if (!container) return { blocks: [], currentIndex: -1, depth: 0 };

      const blockEls = container.querySelectorAll('[data-testid="runtime-block"]');
      const blocks: RuntimeBlock[] = [];
      let currentIndex = -1;

      blockEls.forEach((el, i) => {
        const htmlEl = el as HTMLElement;
        const isActive = htmlEl.dataset.active === 'true';
        if (isActive) currentIndex = i;

        const metricEls = htmlEl.querySelectorAll('[data-testid="block-metric"]');
        const metrics = Array.from(metricEls).map(m => {
          const mEl = m as HTMLElement;
          return {
            type: mEl.dataset.metricType ?? '',
            value: mEl.dataset.metricValue ?? '',
          };
        });

        blocks.push({
          key: htmlEl.dataset.blockKey ?? `block-${i}`,
          blockType: htmlEl.dataset.blockType ?? '',
          depth: parseInt(htmlEl.dataset.depth ?? '0'),
          metrics,
          isActive,
        });
      });

      return {
        blocks,
        currentIndex,
        depth: parseInt(
          (container as HTMLElement).dataset.stackDepth ?? String(blocks.length)
        ),
      };
    }

    function extractMemoryState() {
      const container = document.querySelector('[data-testid="memory-state"]');
      if (!container) return { entries: [], totalAllocated: 0, summary: { byType: {}, byOwner: {} } };

      const entryEls = container.querySelectorAll('[data-testid="memory-entry"]');
      const entries = Array.from(entryEls).map(el => {
        const htmlEl = el as HTMLElement;
        let value: unknown = htmlEl.dataset.value ?? '';
        try { value = JSON.parse(value as string); } catch { /* keep as string */ }
        return {
          id: htmlEl.dataset.id ?? '',
          type: htmlEl.dataset.memoryType ?? '',
          ownerId: htmlEl.dataset.ownerId ?? '',
          value,
          isValid: !htmlEl.classList.contains('invalid'),
          children: parseInt(htmlEl.dataset.children ?? '0'),
        };
      });

      const byType: Record<string, number> = {};
      const byOwner: Record<string, number> = {};
      entries.forEach(e => {
        byType[e.type] = (byType[e.type] ?? 0) + 1;
        byOwner[e.ownerId] = (byOwner[e.ownerId] ?? 0) + 1;
      });

      return {
        entries,
        totalAllocated: parseInt(
          (container as HTMLElement).dataset.totalAllocated ?? String(entries.length)
        ),
        summary: { byType, byOwner },
      };
    }

    return {
      stack: extractStackState(),
      memory: extractMemoryState(),
    };
  });
}
```

**Impact**: `RuntimeAssertions` and `WorkoutAssertions` start working. Per-step state validation is unblocked.

---

### Tier 2 — Integration: Activate the Workout Fixture Specification

**Files**: `e2e/fixtures/workout-data.ts`, `e2e/integration/crossfit-benchmarks.e2e.ts`

**Problem**: `workout-data.ts` defines 12 `WorkoutTestCase` objects with full `validationSteps[]`. No test uses them. `crossfit-benchmarks.e2e.ts` instead has a click-counting while-loop that counts to 10 and passes if ≥6 advances happened. Deletion test: remove `workout-data.ts` → zero test failures.

**Fix**: A `WorkoutTestRunner` executor that drives a `WorkoutTestCase` end-to-end:

```typescript
// e2e/utils/workout-test-runner.ts
import { Page } from '@playwright/test';
import { WorkoutTestCase } from '../fixtures/workout-data';
import { extractRuntimeState } from './runtime-helpers';
import { RuntimeAssertions } from './assertion-helpers';

export async function runWorkoutTest(page: Page, workout: WorkoutTestCase): Promise<void> {
  const storyId = `acceptance-runtimecrossfit--${workout.name.toLowerCase()}`;
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Start
  await page.locator('#tutorial-view-mode-plan').click();
  const editor = page.locator('.cm-note-editor').first();
  if (await editor.count()) await editor.hover();
  const startBtn = page.locator('[data-testid="editor-start-workout"]');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();

  // Validate each step
  const next = page
    .locator('[data-testid="tracker-next"]')
    .or(page.getByRole('button', { name: /next block/i }))
    .first();
  await next.waitFor({ state: 'visible', timeout: 8000 });

  for (const step of workout.validationSteps) {
    const state = await extractRuntimeState(page);
    const ctx = `${workout.name} step ${step.stepNumber}`;

    if (step.expectedStackDepth !== undefined) {
      await RuntimeAssertions.expectStackDepth(state.stack, step.expectedStackDepth, ctx);
    }
    if (step.expectedCurrentRound !== undefined) {
      await RuntimeAssertions.expectCurrentRound(state.memory, step.expectedCurrentRound, ctx);
    }
    if (step.expectedReps !== undefined) {
      await RuntimeAssertions.expectCurrentReps(state.stack, step.expectedReps, ctx);
    }
    for (const assertion of step.memoryAssertions ?? []) {
      await RuntimeAssertions.expectMemoryEntry(
        state.memory, assertion.type, assertion.expectedValue, undefined, ctx
      );
    }

    const isLast = step.stepNumber === workout.validationSteps.length;
    if (!isLast) {
      await next.click();
      await page.waitForTimeout(300);
    }
  }

  // Final: workout complete
  const final = await extractRuntimeState(page);
  await RuntimeAssertions.expectWorkoutComplete(final, workout.name);
}
```

`crossfit-benchmarks.e2e.ts` becomes a parameterized loop:

```typescript
import { VARIABLE_REP_WORKOUTS, FIXED_ROUNDS_WORKOUTS } from '../fixtures/workout-data';
import { runWorkoutTest } from '../utils/workout-test-runner';

test.describe('CrossFit Workouts', () => {
  for (const workout of [...VARIABLE_REP_WORKOUTS, ...FIXED_ROUNDS_WORKOUTS]) {
    test(workout.name, async ({ page }) => {
      await runWorkoutTest(page, workout);
    });
  }
});
```

**Impact**: All 12 workouts tested with per-step state assertion. New workouts require adding one object to `workout-data.ts`, not a new test function.

---

### Tier 2 — Integration: Consolidate Page Objects

**Files**: `e2e/pages/JitCompilerDemoPage.ts`, `e2e/pages/WorkbenchPage.ts`

**Problem**: `JitCompilerDemoPage` targets story IDs that don't exist (`runtime-crossfit--fran`). `WorkbenchPage` targets `testing-workouts--loops-fixed` which also doesn't exist. Neither is imported by any test. Both have been superseded by the inline helpers in `crossfit-benchmarks.e2e.ts`. Deletion test: delete both → zero test failures.

**Fix**: Delete `JitCompilerDemoPage.ts`. Rewrite `WorkbenchPage.ts` to target the real story IDs and expose the helpers that `crossfit-benchmarks.e2e.ts` currently inlines:

```typescript
// e2e/pages/WorkbenchPage.ts
export class WorkbenchPage {
  constructor(private page: Page) {}

  async gotoWorkout(name: string) {
    const id = `acceptance-runtimecrossfit--${name.toLowerCase()}`;
    await this.page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async clickRunButton() {
    await this.page.locator('#tutorial-view-mode-plan').click();
    const editor = this.page.locator('.cm-note-editor').first();
    if (await editor.count()) await editor.hover();
    const btn = this.page.locator('[data-testid="editor-start-workout"]');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  nextButton() {
    return this.page
      .locator('[data-testid="tracker-next"]')
      .or(this.page.getByRole('button', { name: /next block/i }))
      .first();
  }

  async clickNextBlock() {
    await this.nextButton().click();
    await this.page.waitForTimeout(300);
  }

  async isNextBlockVisible() {
    return this.nextButton().isVisible({ timeout: 1500 }).catch(() => false);
  }

  async getRuntimeState() {
    return extractRuntimeState(this.page);
  }

  async switchToReview() {
    const overlay = this.page.locator('[class*="fixed"][class*="inset-0"]').first();
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await overlay.locator('button').last().click({ force: true });
      await this.page.waitForTimeout(800);
    }
    await this.page.evaluate(() => {
      (document.querySelector('#tutorial-view-mode-review') as HTMLElement)?.click();
    });
    await this.page.waitForTimeout(800);
  }
}
```

---

### Tier 2 — Integration: Create Missing Notebook Story

**Files**: `stories/catalog/pages/Notebook.stories.tsx`, `playwright.integration.config.ts`

**Problem**: `e2e/integration/history-panel-navigation.e2e.ts` is excluded from the config because `notebook--default` story doesn't exist. The test is well-written and architecturally sound. `stories/catalog/integration/PlaygroundJournal.stories.tsx` already exists and is the right base for the story.

**Fix**: Scaffold `stories/catalog/pages/Notebook.stories.tsx` with at least a `Default` story that exposes `data-view-id` attributes, then remove the exclusion from the integration config.

---

### Tier 3 — E2E: Consolidate into Single Config

**Files**: `playwright.journal.config.ts`, `playwright.repro.config.ts`

**Problem**: Two configs targeting the same server with overlapping `testMatch` patterns. `repro` has no npm script. Neither has a clear charter distinguishing them.

**Fix**: Merge into `playwright.e2e.config.ts` as described above. Delete `playwright.journal.config.ts` and `playwright.repro.config.ts`.

---

## Migration Checklist

### Phase 1 — Rename and Restructure (no behavior change)

- [ ] Create `e2e/integration/` directory; move `e2e/acceptance/*.e2e.ts` files there
- [ ] Create `e2e/playground/` directory; move `e2e/live-app/*.e2e.ts` files there
- [ ] Create `playwright.integration.config.ts` (copy of `playwright.config.ts` with updated `testDir`)
- [ ] Create `playwright.e2e.config.ts` (merge of `playwright.journal.config.ts` + `playwright.repro.config.ts` with `E2E_BASE_URL` support)
- [ ] Update `package.json` scripts: add `test:integration`, rename `test:e2e`, remove `test:e2e:journal`
- [ ] Delete `playwright.journal.config.ts` and `playwright.repro.config.ts`
- [ ] Verify `bun run test:integration` passes all previously-passing acceptance tests
- [ ] Verify `bun run test:e2e` passes all previously-passing live-app tests

### Phase 2 — Fix Tier 2 Runtime State (unblocks state validation)

- [ ] Add `data-testid` attributes to `StorybookWorkbench` block display and memory visualization
- [ ] Rewrite `runtime-helpers.ts` `extractRuntimeState()` with inline browser functions
- [ ] Verify `RuntimeAssertions.expectStackDepth()` returns real data on a running story
- [ ] Update `WorkbenchPage.ts` to target correct story IDs; delete `JitCompilerDemoPage.ts`

### Phase 3 — Activate Workout Fixture Executor

- [ ] Write `e2e/utils/workout-test-runner.ts`
- [ ] Add `validationSteps[]` to `Fran` and `Annie` in `workout-data.ts` (Fran already done)
- [ ] Refactor `crossfit-benchmarks.e2e.ts` to use parameterized loop
- [ ] Verify all 4 CrossFit stories pass with per-step state assertions

### Phase 4 — Unblock History Navigation

- [ ] Create `stories/catalog/pages/Notebook.stories.tsx` with `Default` story
- [ ] Remove `history-panel-navigation.e2e.ts` exclusion from `playwright.integration.config.ts`
- [ ] Verify test passes

### Phase 5 — Expand Coverage

- [ ] Write `play()` functions in acceptance stories to populate `bun run test:stories`
- [ ] Add Tier 3 tests for: metric inheritance scenarios, AMRAP completion, EMOM timing
- [ ] Add `E2E_BASE_URL` CI job to run against deployed playground on merge to main
- [ ] Add viewport-parameterized integration tests for Tracker/Review/NoteEditor

---

## Summary of Config Files (Target State)

| File | Tier | Target | Command | Purpose |
|------|------|--------|---------|---------|
| *(none — bun built-in)* | 1 | Source modules | `bun run test` | Unit tests |
| `vitest.storybook.config.js` | 2A | Story `play()` fns | `bun run test:stories` | In-browser component tests |
| `playwright.integration.config.ts` | 2B | Storybook `:6006` | `bun run test:integration` | Playwright Storybook tests |
| `playwright.e2e.config.ts` | 3 | Playground `:5173` or `$E2E_BASE_URL` | `bun run test:e2e` | Full app acceptance tests |
| `playwright.config.ts` | 2+3 | Both | *(local use only)* | Aggregate for local full run |

---

## References

- **E2E architecture deep dive**: `/docs/e2e-architecture-assessment.md`
- **Storybook layer model**: `/docs/storybook-e2e-architecture-audit.md`
- **Test harness guide**: `/docs/testing/block_isolation_testing_guide.md`
- **Fixture specification**: `/e2e/fixtures/workout-data.ts`
- **Current integration config**: `/playwright.config.ts`
- **Current e2e config**: `/playwright.journal.config.ts`
