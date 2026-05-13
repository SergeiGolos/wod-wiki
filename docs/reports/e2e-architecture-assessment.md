# E2E Architecture Assessment — High-Level Flows

**Date**: 2026-05-08 | **Status**: Assessment | **Scope**: E2E test suite structure, flow coverage, architectural friction

---

## Executive Summary

The e2e test suite is building toward **six high-level user flows** spanning workout execution, live app navigation, journal persistence, and editor UX. **Four flows are functional** (comment rendering, fullscreen timer, live app navigation, journal persistence), but **Flow 1 (Workout Execution)** — the most critical — is only partially working: tests click through workouts but cannot assert runtime state because a foundational module (`runtime-helpers.ts`) has a fatally broken implementation that silently returns empty data.

The suite also has **structural friction**:
- Two test targets (Storybook + live app) coexist in the same directory with an implicit, undeclared seam
- A rich specification of workout test cases and runtime assertions lives in dead code (`fixtures/workout-data.ts`, page objects) with no executor connecting them
- Page objects target non-existent stories (orphaned code)
- A well-designed story (`history-panel-navigation.e2e.ts`) is blocked only by a missing test story

**Five deepening opportunities** are presented, ranked by leverage and risk. The highest-impact fix combines rewriting `runtime-helpers.ts` (broken interface implementation) with building a `WorkoutTestRunner` executor to activate the idle fixture specification — this would unlock full state-based validation of all 12 CrossFit benchmark workouts.

---

## The Six Flows Being Built

| # | Flow | Test file(s) | Target | Status | Coverage |
|---|------|-------------|--------|--------|----------|
| **1** | **Workout Execution** — Parse → Compile → Stack → Advance → Review | `crossfit-benchmarks.e2e.ts` | Storybook (`acceptance/RuntimeCrossFit`) | ⚠️ Partially working | Click-counting only; no state assertion |
| **2** | **Live App Navigation** — Collections → Workout → Editor → Run | `dead-click-handlers.e2e.ts` | Live app | ✅ Fully working | Excluded from CI |
| **3** | **Journal Persistence** — Edit → Save → Reload → Verify | `journal-entry.e2e.ts`, `journal-scroll.e2e.ts` | Live app | ✅ Fully working | Excluded from CI |
| **4** | **Editor UX** — Focus → Cursor position → Metric panel | `cursor-focus-panel.e2e.ts` | Storybook | ✅ Working | Desktop + mobile viewports |
| **5** | **Component Visual Regression** — Render → Assert classes/text | `comment-vs-action-item.e2e.ts`, `fullscreen-timer-close.e2e.ts`, `home-feature-card-markdown.e2e.ts` | Storybook | ✅ Working | 3 core UX regressions |
| **6** | **Notebook / History Navigation** — History list → click → Plan view | `history-panel-navigation.e2e.ts` | Storybook | ❌ Excluded | Story missing (`notebook--default`) |

---

## Current State — What's Running

### In CI (via `playwright.config.ts`)

**Acceptance tests** (`e2e/acceptance/`):
- `comment-vs-action-item.e2e.ts` — MetricVisualizer: comment vs action item rendering ✅
- `cursor-focus-panel.e2e.ts` — NoteEditor: cursor focus panel layout ✅
- `fullscreen-timer-close.e2e.ts` — FullscreenTimer: close button responsiveness ✅
- `home-feature-card-markdown.e2e.ts` — HomeView: markdown feature cards ✅
- `crossfit-benchmarks.e2e.ts` — RuntimeCrossFit: smoke + Fran execution + Annie partial ⚠️
- `history-panel-navigation.e2e.ts` — Excluded (story doesn't exist)

### Excluded from CI (via `testIgnore`)

**Live app tests** (`e2e/live-app/`):
- `canvas-editor-frontmatter.e2e.ts` — /syntax route: YAML frontmatter hidden ✅
- `dead-click-handlers.e2e.ts` — Collections → workouts navigation ✅
- `journal-entry.e2e.ts` — Journal entry creation, save, reload ✅
- `journal-scroll.e2e.ts` — JournalDateScroll: virtualization + date navigation ✅
- `playground-widget-block-preview.e2e.ts` — Widget replacement in playground ✅
- `wod-index-play-button.e2e.ts` — WOD index: play button triggers runtime ✅

---

## Identified Friction Points

### 1. Runtime State Extraction — Broken Interface

**Module**: `e2e/utils/runtime-helpers.ts`

**Problem**:

The module exports a rich interface promising to extract complete runtime state:

```typescript
export async function extractRuntimeState(page: Page): Promise<RuntimeState>
// → { stack: RuntimeStackState, memory: MemoryState, timer?: TimerState, script: ScriptState }
```

But the implementation is **fatally broken**. It calls:

```typescript
export async function extractRuntimeState(page: Page): Promise<RuntimeState> {
  return await page.evaluate(() => {
    const state: RuntimeState = {
      stack: extractStackState(),           // ← TypeScript function defined in Node.js module
      memory: extractMemoryStateInBrowser(), // ← Does NOT exist in browser context
      timer: extractTimerStateInBrowser(),   // ← Does NOT exist
      script: extractScriptState()           // ← Does NOT exist
    };
    return state;
  });
}
```

The functions `extractStackStateInBrowser`, `extractMemoryStateInBrowser`, etc. are defined in the *same* Node.js module file — they don't exist in the browser context where `page.evaluate()` runs. The browser context fails silently, returning `{ blocks: [], depth: 0, entries: [] }`.

**Impact**:
- `RuntimeAssertions` class (15 well-designed assertion methods) is dead code
- `WorkoutAssertions` (fixture-specific assertions for Fran, Barbara, Cindy) is dead code
- `crossfit-benchmarks.e2e.ts` can only click through and count advances; it cannot validate runtime state, rounds, reps, or memory
- The fixture data in `fixtures/workout-data.ts` (12 workout definitions with `validationSteps[]`) cannot be executed

**Secondary Problem**: Even if the browser context were fixed, the scraping assumes component structure that doesn't exist:
- Components don't emit `data-testid="runtime-block"`, `data-block-type`, `data-depth`
- No `[data-metric]` or `[data-metric-type]` attributes on metric displays
- Scraping falls back to CSS class heuristics like `.runtime-block`, `.memory-entry` that aren't rendered

**Solution**:

**Part 1**: Instrument components with `data-testid` contract:
- `StorybookWorkbench` runtime display → `data-testid="runtime-stack"`
- Each block display → `data-testid="runtime-block"`, `data-block-type="Effort|Timer|..."`, `data-depth="0|1|2"`
- Memory visualization → `data-testid="memory-state"`, each entry `data-memory-entry` with `data-type`, `data-owner-id`, `data-value`
- Timer display → `data-testid="timer-state"`, `data-timer-running`, `data-timer-elapsed-ms`, `data-timer-total-ms`

**Part 2**: Rewrite `extractRuntimeState` so browser functions are serialized inline:

```typescript
export async function extractRuntimeState(page: Page): Promise<RuntimeState> {
  return await page.evaluate(() => {
    // All functions defined here, in browser context
    function extractStackState(): RuntimeStackState {
      const stackContainer = document.querySelector('[data-testid="runtime-stack"]');
      if (!stackContainer) return { blocks: [], currentIndex: -1, depth: 0 };
      // ... scraping logic
    }
    function extractMemoryState(): MemoryState {
      // ... scraping logic
    }
    // ... etc.
    return {
      stack: extractStackState(),
      memory: extractMemoryState(),
      timer: extractTimerState(),
      script: extractScriptState()
    };
  });
}
```

**Benefits**:
- Every `WorkoutTestCase` in `fixtures/workout-data.ts` becomes executable
- `RuntimeAssertions.expectFranState(state, 3)` becomes a real assertion
- Locality: all runtime extraction knowledge lives in one tested module
- Leverage: adoption of `data-testid` unblocks both e2e tests and future debugging tools

---

### 2. Workout Test Fixture — Specification Without Executor

**Module**: `e2e/fixtures/workout-data.ts`

**Problem**:

The module defines 12 `WorkoutTestCase` objects with rich metadata:

```typescript
export interface WorkoutTestCase {
  name: string;
  script: string;
  expectedNextCalls: number;
  expectedRounds: number[];
  expectedReps: number[];
  validationSteps: ValidationStep[];
  workoutType: 'variable-rep' | 'fixed-rounds' | 'time-based' | 'complex';
}

export interface ValidationStep {
  stepNumber: number;
  expectedStackDepth: number;
  expectedCurrentRound?: number;
  expectedReps?: number;
  expectedBlockType?: string;
  memoryAssertions?: MemoryAssertion[];
}
```

**Example** (`Fran`):
```typescript
{
  name: 'Fran',
  script: `(21-15-9)\nThrusters 95lb\nPullups`,
  expectedNextCalls: 7,
  expectedRounds: [1, 1, 2, 2, 3, 3],
  expectedReps: [21, 21, 15, 15, 9, 9],
  workoutType: 'variable-rep',
  validationSteps: [
    {
      stepNumber: 1,
      expectedStackDepth: 2,
      expectedCurrentRound: 1,
      expectedReps: 21,
      expectedBlockType: 'Effort',
      memoryAssertions: [
        { type: 'rounds-current', expectedValue: 1 },
        { type: 'rounds-total', expectedValue: 3 }
      ]
    },
    // ... 6 more steps
  ]
}
```

This is a **deep specification** — a complete protocol for validating one workout execution from start to finish. But `crossfit-benchmarks.e2e.ts` ignores it entirely:

```typescript
// In crossfit-benchmarks.e2e.ts
test('Next button advances through all Fran blocks', async ({ page }) => {
  await clickRunButton(page);
  const next = nextButton(page);
  let advances = 0;
  const MAX_ADVANCES = 10;
  while (advances < MAX_ADVANCES) {
    const isVisible = await next.isVisible({ timeout: 1500 }).catch(() => false);
    if (!isVisible) break;
    await next.click();
    await page.waitForTimeout(300);
    advances++;
  }
  expect(advances).toBeGreaterThanOrEqual(6);
});
```

The test is **click-counting only** — it verifies 6 advances happened, not that the *correct* rounds/reps/metrics were shown at each step.

**Deletion test**: Remove `fixtures/workout-data.ts`. Zero test failures. It's earning no keep.

**Impact**:
- 12 workout definitions exist but only 2–3 are tested via this simple click-loop
- Adding a new workout requires editing `crossfit-benchmarks.e2e.ts` to add a new `test()` function
- No per-step state validation; tests cannot detect if wrong reps were shown or rounds incremented incorrectly
- The fixture is beautiful design but orphaned code

**Solution**:

Build a `WorkoutTestRunner` executor function:

```typescript
// e2e/utils/workout-test-runner.ts

export async function runWorkoutTest(
  page: Page,
  workoutCase: WorkoutTestCase,
  storyUrl: string
): Promise<void> {
  // Load story
  await page.goto(storyUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Click Run
  await clickRunButton(page);
  await nextButton(page).waitFor({ state: 'visible', timeout: 8000 });

  // For each validation step
  for (const step of workoutCase.validationSteps) {
    const state = await extractRuntimeState(page);
    const context = `${workoutCase.name} step ${step.stepNumber}`;

    // Assert stack depth
    if (step.expectedStackDepth !== undefined) {
      await RuntimeAssertions.expectStackDepth(
        state.stack,
        step.expectedStackDepth,
        context
      );
    }

    // Assert round
    if (step.expectedCurrentRound !== undefined) {
      await RuntimeAssertions.expectCurrentRound(
        state.memory,
        step.expectedCurrentRound,
        context
      );
    }

    // Assert reps
    if (step.expectedReps !== undefined) {
      await RuntimeAssertions.expectCurrentReps(
        state.stack,
        step.expectedReps,
        context
      );
    }

    // Assert memory entries
    if (step.memoryAssertions) {
      for (const memAssertion of step.memoryAssertions) {
        await RuntimeAssertions.expectMemoryEntry(
          state.memory,
          memAssertion.type,
          memAssertion.expectedValue,
          undefined,
          context
        );
      }
    }

    // Click Next (unless last step)
    if (step.stepNumber < workoutCase.validationSteps.length) {
      await nextButton(page).click();
      await page.waitForTimeout(300);
    }
  }

  // Final assertion: workout complete
  const finalState = await extractRuntimeState(page);
  await RuntimeAssertions.expectWorkoutComplete(finalState, workoutCase.name);
}
```

Then `crossfit-benchmarks.e2e.ts` becomes:

```typescript
import { runWorkoutTest } from '../utils/workout-test-runner';
import { VARIABLE_REP_WORKOUTS, FIXED_ROUNDS_WORKOUTS } from '../fixtures/workout-data';

test.describe('CrossFit Workouts — State Validation', () => {
  for (const workout of [...VARIABLE_REP_WORKOUTS, ...FIXED_ROUNDS_WORKOUTS]) {
    test(`${workout.name}`, async ({ page }) => {
      const storyUrl = `/iframe.html?id=acceptance-runtimecrossfit--${workout.name.toLowerCase()}&viewMode=story`;
      await runWorkoutTest(page, workout, storyUrl);
    });
  }
});
```

**Benefits**:
- All 12 workouts tested with the same orchestrator
- Per-step validation at each block advance
- New workouts added to fixture, not to test code
- Executor is the seam; fixture is the data
- Leverages the entire `RuntimeAssertions` + `WorkoutAssertions` API that's currently dead code
- Locality: workout test logic concentrated in one executor, not scattered across 12 test functions

---

### 3. Page Objects — Shallow Adapters Targeting Dead Stories

**Files**: `e2e/pages/JitCompilerDemoPage.ts`, `e2e/pages/WorkbenchPage.ts`

**Problem**:

Two page objects exist that should be the primary interface for Flow 1 (Workout Execution). But both are orphaned:

**`JitCompilerDemoPage`**:
- Targets story IDs like `runtime-crossfit--fran` (doesn't exist)
- Actual story ID is `acceptance-runtimecrossfit--fran`
- Not imported by any test
- Has methods like `clickNextBlock()`, `getRuntimeStack()`, `expectStackDepth()` but they depend on broken `runtime-helpers`

**`WorkbenchPage`**:
- Targets story ID `testing-workouts--loops-fixed` (doesn't exist)
- Not imported by any test
- Has higher-level methods like `switchView()`, `startWorkout()`, `nextBlock()` but they're untested wrappers

Meanwhile, **`crossfit-benchmarks.e2e.ts` defines inline helpers**:

```typescript
async function clickRunButton(page: Page) {
  await page.locator('#tutorial-view-mode-plan').click();
  const editor = page.locator('.cm-note-editor').first();
  if (await editor.count()) await editor.hover();
  const startBtn = page.locator('[data-testid="editor-start-workout"]').first();
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();
}

function nextButton(page: Page) {
  return page.locator('[data-testid="tracker-next"]')
    .or(page.locator('[title="Next Block"]'))
    .or(page.getByRole('button', { name: /next block/i }))
    .first();
}
```

These are essentially adapter methods that belong on a page object, not duplicated in the test.

**Deletion test**: Delete both page objects. `crossfit-benchmarks.e2e.ts` still runs because it inlines all the logic. This signals dead code.

**Impact**:
- Two shallow adapters + one inline adapter for the same component
- Any UI change requires fixes in multiple places
- Developers don't know which page object to use
- The page objects' methods promise richer state inspection (e.g., `getRuntimeStack()`) that doesn't work due to broken `runtime-helpers`

**Solution**:

**Consolidate into one `WorkbenchPage`**:

```typescript
// e2e/pages/WorkbenchPage.ts

export class WorkbenchPage {
  readonly page: Page;
  private readonly baseUrl = '/iframe.html?id=acceptance-runtimecrossfit--{name}&viewMode=story';

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ────────────────────────────────────────────────────────
  async gotoWorkout(name: string): Promise<void> {
    const url = this.baseUrl.replace('{name}', name.toLowerCase());
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500); // WorkbenchProvider initialization
  }

  // ── View Switching ────────────────────────────────────────────────────
  async switchViewPlan(): Promise<void> {
    await this.page.locator('#tutorial-view-mode-plan').click();
    await this.page.waitForTimeout(300);
  }

  async switchViewTrack(): Promise<void> {
    await this.page.locator('#tutorial-view-mode-track').click();
    await this.page.waitForTimeout(300);
  }

  async switchViewReview(): Promise<void> {
    await this.page.evaluate(() => {
      (document.querySelector('#tutorial-view-mode-review') as HTMLElement)?.click();
    });
    await this.page.waitForTimeout(300);
  }

  // ── Workout Controls ──────────────────────────────────────────────────
  async clickRunButton(): Promise<void> {
    await this.switchViewPlan();
    const editor = this.page.locator('.cm-note-editor').first();
    if (await editor.count()) await editor.hover();
    const startBtn = this.page.locator('[data-testid="editor-start-workout"]').first();
    await startBtn.waitFor({ state: 'visible', timeout: 5000 });
    await startBtn.click();
  }

  private nextButton() {
    return this.page
      .locator('[data-testid="tracker-next"]')
      .or(this.page.locator('[title="Next Block"]'))
      .or(this.page.getByRole('button', { name: /next block/i }))
      .first();
  }

  async clickNextBlock(): Promise<void> {
    await this.nextButton().click();
    await this.page.waitForTimeout(300);
  }

  async isNextBlockVisible(): Promise<boolean> {
    return this.nextButton().isVisible({ timeout: 1500 }).catch(() => false);
  }

  // ── State Inspection ──────────────────────────────────────────────────
  async getRuntimeState(): Promise<RuntimeState> {
    return extractRuntimeState(this.page);
  }

  async getCurrentBlockInfo(): Promise<RuntimeBlock | null> {
    const state = await this.getRuntimeState();
    if (state.stack.currentIndex >= 0 && state.stack.currentIndex < state.stack.blocks.length) {
      return state.stack.blocks[state.stack.currentIndex] ?? null;
    }
    return null;
  }

  // ── Results ───────────────────────────────────────────────────────────
  async switchToReviewAndWait(): Promise<void> {
    const timerOverlay = this.page.locator('[class*="fixed"][class*="inset-0"][class*="z-[100]"]').first();
    if (await timerOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const buttons = timerOverlay.locator('button');
      const count = await buttons.count();
      if (count > 0) {
        await buttons.last().click({ force: true });
      }
      await this.page.waitForTimeout(800);
    }
    await this.switchViewReview();
  }

  async getReviewPanel(): Promise<Locator> {
    return this.page
      .locator('[data-testid="review-panel"]')
      .or(this.page.locator('table:not([aria-hidden])'))
      .first();
  }

  // ── Assertions ────────────────────────────────────────────────────────
  async expectStackDepth(expected: number): Promise<void> {
    const state = await this.getRuntimeState();
    expect(state.stack.depth).toBe(expected);
  }

  async expectCurrentRound(expected: number): Promise<void> {
    const state = await this.getRuntimeState();
    await RuntimeAssertions.expectCurrentRound(state.memory, expected);
  }

  async expectWorkoutComplete(): Promise<void> {
    const state = await this.getRuntimeState();
    await RuntimeAssertions.expectWorkoutComplete(state);
  }
}
```

Then delete `JitCompilerDemoPage.ts`. Update `crossfit-benchmarks.e2e.ts` to use the consolidated adapter:

```typescript
import { WorkbenchPage } from '../pages/WorkbenchPage';

test('Next button advances through all Fran blocks', async ({ page }) => {
  const workbench = new WorkbenchPage(page);
  await workbench.gotoWorkout('fran');
  await workbench.clickRunButton();
  
  let advances = 0;
  const MAX_ADVANCES = 10;
  while (advances < MAX_ADVANCES && await workbench.isNextBlockVisible()) {
    await workbench.clickNextBlock();
    advances++;
  }

  expect(advances).toBeGreaterThanOrEqual(6);
});
```

**Benefits**:
- One adapter = one place to fix when UI changes
- Higher-level API (e.g., `switchViewPlan()` handles timing; `switchViewReview()` handles overlay closure)
- Consolidates state inspection methods that actually work (after fixing `runtime-helpers`)
- Tests become more readable and less duplication

---

### 4. Two-Target Split — Implicit Seam, No Declared Boundary

**Files**: `playwright.config.ts`, `e2e/`, `e2e/storybook/`, `e2e/live-app/`

**Problem**:

The suite tests two fundamentally different targets:

1. **Storybook** — iframe-based story components at `:6006`
   - Tests in `e2e/acceptance/`
   - Stories loaded via `iframe.html?id=<storyId>&viewMode=story`
   - Story IDs are canonical; if story is renamed, all tests break

2. **Live Playground App** — full SPA at `:5173`
   - Tests in `e2e/live-app/`
   - Routes are `/journal`, `/collections`, `/workout/:id`, etc.
   - Different providers (theme, auth, router context)
   - IndexedDB integration for persistence

The split is **encoded implicitly** via `testIgnore` in `playwright.config.ts`:

```typescript
testIgnore: [
  '**/live-app/**',
  '**/acceptance/history-panel-navigation.e2e.ts',
]
```

A developer reading a test file **cannot tell if it will run in CI** without checking the config. A test in `e2e/live-app/journal-entry.e2e.ts` silently doesn't run in the main CI flow, yet it's in the same directory as `e2e/acceptance/crossfit-benchmarks.e2e.ts` which does run. There's likely a second config file (`playwright.journal.config.ts`) that runs the live-app tests separately, but it's not visible in the repo structure.

**Adapters are mixed**: `e2e/pages/JournalEntryPage.ts` is an SPA adapter (direct page navigation, IndexedDB access); `WorkbenchPage` is an iframe adapter (story URL construction). Both live in `e2e/pages/` with no distinction.

**Impact**:
- Config split is invisible; developers can't easily discover what runs where
- CI commands are scattered / not documented in one place
- Adding a new test requires knowing which config it should target
- Maintenance burden: fixing a story URL breaks Storybook tests silently
- No clear dependency on different servers (Storybook server vs. playground server)

**Solution**:

**Explicit directory structure and separate configs**:

```
e2e/
├── storybook/
│   ├── acceptance/
│   │   ├── comment-vs-action-item.e2e.ts
│   │   ├── crossfit-benchmarks.e2e.ts
│   │   ├── cursor-focus-panel.e2e.ts
│   │   ├── fullscreen-timer-close.e2e.ts
│   │   ├── home-feature-card-markdown.e2e.ts
│   │   └── history-panel-navigation.e2e.ts
│   └── utils/
│       ├── assertion-helpers.ts
│       └── runtime-helpers.ts (now works correctly)
├── live-app/
│   ├── canvas-editor-frontmatter.e2e.ts
│   ├── dead-click-handlers.e2e.ts
│   ├── journal-entry.e2e.ts
│   ├── journal-scroll.e2e.ts
│   ├── playground-widget-block-preview.e2e.ts
│   └── wod-index-play-button.e2e.ts
└── pages/
    ├── storybook/
    │   ├── WorkbenchPage.ts
    │   └── SharedFixtures.ts
    └── live-app/
        ├── JournalEntryPage.ts
        ├── JournalPage.ts
        └── ...

playwright.storybook.config.ts
playwright.live-app.config.ts
playwright.config.ts  (aggregate, runs all)
```

**Each config targets its own server**:

```typescript
// playwright.storybook.config.ts
export default defineConfig({
  testDir: './e2e/storybook',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: 'http://localhost:6006',
  },
  webServer: {
    command: 'bun run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});

// playwright.live-app.config.ts
export default defineConfig({
  testDir: './e2e/live-app',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});

// playwright.config.ts (aggregate)
export default defineConfig({
  projects: [
    {
      name: 'storybook',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/storybook',
    },
    {
      name: 'live-app',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/live-app',
    },
  ],
});
```

**CI commands become explicit**:

```bash
# Run all
bun x playwright test

# Run only Storybook tests
bun x playwright test --config playwright.storybook.config.ts

# Run only live-app tests
bun x playwright test --config playwright.live-app.config.ts

# Run specific story
bun x playwright test e2e/storybook/acceptance/crossfit-benchmarks.e2e.ts
```

**Benefits**:
- Seam is declared; developers immediately see which target each test hits
- CI commands are explicit and discoverable
- Server dependencies are clear
- Page objects are grouped by adapter type
- No hidden `testIgnore` logic
- Locality: each target's fragility (story IDs vs. routes) is contained in its own directory

---

### 5. Blocked Test — Missing Story

**File**: `e2e/acceptance/history-panel-navigation.e2e.ts`

**Problem**:

This is a well-formed acceptance test exercising a real user flow (History panel → click entry → Plan view switch):

```typescript
test('clicking a history entry row should show Plan view', async ({ page }) => {
  await page.goto(STORYBOOK_URL, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('[data-view-id]', { timeout: 10000 });

  const historyView = page.locator('[data-view-id="history"]');
  await expect(historyView).toBeVisible({ timeout: 5000 });

  // Create entries
  // ...

  // Click entry
  const entryRow = page.getByRole('button', { name: /new workout/i });
  await entryRow.click();

  // Assert Plan view visible
  const planView = page.locator('[data-view-id="plan"]');
  await expect(planView).toBeVisible();
});
```

The test targets `STORYBOOK_URL = '/iframe.html?id=notebook--default&viewMode=story'`, but the story doesn't exist. The test is excluded from `playwright.config.ts`:

```typescript
testIgnore: [
  '**/live-app/**',
  '**/acceptance/history-panel-navigation.e2e.ts', // ← TODO: remove once story created
]
```

The comment in the config says: _"TODO: remove this exclusion once `stories/catalog/pages/Notebook.stories.tsx` is added."_

There's already an integration story for `PlaygroundJournal` in `stories/catalog/integration/PlaygroundJournal.stories.tsx`, which may be the right base. The test is architecturally sound but blocked only by missing scaffolding.

**Impact**:
- Flow 6 (Notebook/History Navigation) is not tested
- A developer can't know why this test is excluded without reading the config comment
- The story would enable not just this one test but potentially multiple history-panel interactions

**Solution**:

Create `stories/catalog/pages/Notebook.stories.tsx`:

```typescript
// stories/catalog/pages/Notebook.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StorybookHost } from '../_shared/StorybookHost';
import { Notebook } from '../../playground/src/pages/Notebook'; // or similar

const meta: Meta = {
  title: 'catalog/pages/Notebook',
  component: Notebook,
  parameters: {
    layout: 'fullscreen',
    a11y: { disable: true },
  },
  decorators: [(Story) => <StorybookHost><Story /></StorybookHost>],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    // Initialize with some history entries for the test to interact with
  },
};

export const WithEntries: Story = {
  args: {
    initialEntries: [
      { date: '2026-05-08', content: '# My WOD\n\n10 Burpees' },
      { date: '2026-05-07', content: '# Yesterday\n\n20 Thrusters' },
    ],
  },
};
```

Then remove the `history-panel-navigation.e2e.ts` exclusion from `playwright.config.ts`.

**Benefits**:
- Unblocks Flow 6 testing
- One more integration story for the design system
- Test is already written; just needs the story

---

## What's Not Being Tested

These gaps represent untested flows and coverage voids:

### Missing E2E Coverage

| Category | Gap | Story Exists? | Test Exists? |
|----------|-----|---------------|--------------|
| **Tracker/Review/NoteEditor viewports** | 9 template stories (Web/Mobile/Chromecast × 3 panels) → no e2e tests | ✅ Yes | ❌ No |
| **Metric inheritance** | Weight/load propagates across sets | ⚠️ Partial (in fixtures) | ❌ No |
| **Theme switching** | Light/dark theme toggles across all panels | ✅ Yes | ❌ No |
| **Command palette** | Keyboard navigation, search, selection | ✅ Yes | ❌ No |
| **Effort block variants** | Reps vs. distance vs. time; load rendering | ✅ Partial | ❌ No |

### Fixture Data Unused

- `fixtures/workout-data.ts`: 12 workouts defined, 2–3 actually tested
- `RuntimeAssertions` class: 15 assertion methods, 0 used in tests
- `WorkoutAssertions` class: 4 workout-specific helpers, 0 used
- Page object state inspection methods: all depend on broken `runtime-helpers`

---

## Deepening Opportunities — Prioritized

Listed by leverage (impact × breadth) and risk (implementation complexity):

### Opportunity 1: Fix Runtime State Extraction (Highest Leverage, Medium Risk)

**Modules**: `e2e/utils/runtime-helpers.ts`, `StorybookWorkbench`, `Tracker`/`Review` display panels

**Effort**: 2–3 hours (add `data-testid` to components, rewrite browser context functions)

**Impact**: Unblocks `RuntimeAssertions`, `WorkoutAssertions`, state-based validation

**Prerequisite for**: Opportunity 2 (WorkoutTestRunner), page object state inspection

**Risk**: Low — localized DOM changes, no API changes

---

### Opportunity 2: Build Workout Test Runner (Highest Leverage, Low Risk)

**Modules**: `e2e/utils/workout-test-runner.ts`, `e2e/acceptance/crossfit-benchmarks.e2e.ts`

**Effort**: 2–3 hours (write executor, refactor test file to parameterization)

**Impact**: All 12 workout tests + per-step state validation + fixture specification activated

**Prerequisite**: Opportunity 1

**Risk**: Low — test orchestration, no API changes

---

### Opportunity 3: Consolidate Page Objects (Medium Leverage, Low Risk)

**Modules**: `e2e/pages/WorkbenchPage.ts`, `e2e/pages/JitCompilerDemoPage.ts`, `e2e/acceptance/crossfit-benchmarks.e2e.ts`

**Effort**: 1–2 hours (merge adapters, update test imports)

**Impact**: One adapter, reduced duplication, clearer interface for future developers

**Prerequisites**: None

**Risk**: Low — self-contained refactor

---

### Opportunity 4: Declare E2E Seams with Explicit Configs (Medium Leverage, Low Risk)

**Modules**: `playwright.config.ts`, `e2e/` directory structure

**Effort**: 2–3 hours (split directory, create configs, update CI commands)

**Impact**: Clear boundaries, CI discoverability, separate dependency management

**Prerequisites**: None

**Risk**: Low — config + directory structure

---

### Opportunity 5: Create Notebook Story (Low Leverage, Minimal Risk)

**Modules**: `stories/catalog/pages/Notebook.stories.tsx`, `playwright.config.ts`

**Effort**: 30 mins (scaffold story, remove `testIgnore`)

**Impact**: Unblocks one test (history-panel-navigation), completes integration story coverage

**Prerequisites**: None

**Risk**: Minimal — straightforward story scaffolding

---

## Recommended Implementation Path

### Phase 1 (Week 1) — Unblock Flow 1

1. **Fix `runtime-helpers.ts`** (Opportunity 1)
   - Add `data-testid` to `StorybookWorkbench`, block display, memory visualization
   - Rewrite `extractRuntimeState` with inline browser functions
   - Verify `RuntimeAssertions` now work

2. **Build `WorkoutTestRunner`** (Opportunity 2)
   - Create executor that runs a `WorkoutTestCase` end-to-end
   - Refactor `crossfit-benchmarks.e2e.ts` to parameterization
   - Verify all 4 smoke tests + 3 detailed tests pass with state validation

**Outcome**: Flow 1 (Workout Execution) is now fully testable with per-step state assertions. The fixture specification is no longer dead code.

### Phase 2 (Week 2) — Improve Maintainability

3. **Consolidate Page Objects** (Opportunity 3)
   - Merge `JitCompilerDemoPage` + `WorkbenchPage`, delete orphan
   - Update test imports
   - Verify tests still pass

4. **Declare E2E Seams** (Opportunity 4)
   - Reorganize `e2e/` into `storybook/` and `live-app/` directories
   - Create separate configs
   - Update CI commands in docs
   - Verify tests run in both configs

**Outcome**: E2E suite structure is clear and maintainable. Test discoverability is explicit.

### Phase 3 (Week 3) — Expand Coverage

5. **Create Notebook Story** (Opportunity 5)
   - Scaffold `stories/catalog/pages/Notebook.stories.tsx`
   - Remove `testIgnore` exclusion
   - Verify `history-panel-navigation.e2e.ts` passes

6. **Add Viewport Parameterization** (follow-on)
   - Apply `_contract.ts` pattern to Tracker/Review/NoteEditor stories
   - Add e2e tests for viewport-specific behavior

**Outcome**: Flow 6 (Notebook Navigation) is tested. Viewport variant coverage begins.

---

## References

- **Current e2e test audit**: `/docs/storybook-e2e-architecture-audit.md`
- **Storybook structure proposal**: See Level 3 Component Diagram in audit
- **Page Object Patterns**: `/e2e/pages/*.ts`
- **Fixture Specification**: `/e2e/fixtures/workout-data.ts`
- **Runtime Helpers**: `/e2e/utils/runtime-helpers.ts`

---

## Conclusion

The e2e test suite has **excellent foundational design** — rich fixtures, well-shaped assertions, multiple test targets covering real user flows. But **three orphaned modules** (page objects, runtime helpers, fixture executor) sit disconnected from the actual tests, making the suite appear incomplete or fragmented.

The **highest-impact fix** combines rewriting `runtime-helpers.ts` (Part 1: instrument components, Part 2: fix browser context) with building `WorkoutTestRunner` to activate the idle fixture specification. This would transform Flow 1 from "click-counting" into "state-validating" acceptance tests that exercise the entire JIT compilation + runtime execution pipeline with per-step assertions.

The five opportunities are modular and independent — any can be tackled first — but the recommended path (Flow 1 → Maintainability → Coverage) builds momentum by unblocking the most fragile flow first, then improving the structure to support easier future additions.
