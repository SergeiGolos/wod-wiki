---
name: storybook-playwright-integration
description: "Authoritative guide for writing integration and e2e tests using Storybook 10, @storybook/addon-vitest, and Playwright 1.57. Invoke when writing stories with play() functions, Playwright e2e tests, page objects, or state validation."
applyTo: "e2e/**/*.ts,stories/**/*.stories.tsx"
---

# Storybook + Playwright Integration Testing

## Stack Reference

| Tool | Version | Command | Purpose |
|------|---------|---------|---------|
| Storybook | 10.3.x | `bun run storybook` | Component sandbox + e2e target host |
| @storybook/addon-vitest | 10.3.x | `bun run test:storybook` | Story interaction tests (Vitest browser mode + Playwright provider) |
| Playwright | 1.57.x | `bun run test:e2e` | Full browser e2e tests against Storybook iframe or live app |
| Vitest browser | 3.2.x | (internal — invoked by `bun run test:storybook`) | Browser runtime for story tests |
| BehaviorTestHarness | project | `bun run test` | Unit tests — no DOM |

---

## How to Run Tests (Always Use bun)

> **Rule**: Never invoke `vitest`, `jest`, `npx`, or `npm test` directly. All test commands go through `bun run <script>`. Vitest is an internal detail — it runs under the hood but agents and developers must not call it directly.

| What to run | Command | When |
|-------------|---------|------|
| Unit tests (src/) | `bun run test` | After any logic change |
| Single test file | `bun test src/path/to/file.test.ts --preload ./tests/unit-setup.ts` | Focused debugging |
| Component / harness tests (tests/) | `bun run test:components` | After runtime/harness changes |
| Both unit + component | `bun run test:all` | Before push |
| Story smoke + interaction | `bun run test:storybook` | After story changes |
| E2E acceptance | `bun run test:e2e` | After UI/flow changes |
| Type check | `bun x tsc --noEmit` | After any TypeScript change |

### What runs under the hood (for reference only)

- `bun run test` → `bunx vitest run --config vitest.unit.config.js`
- `bun run test:storybook` → `bunx vitest run --config vitest.storybook.config.js` (Vitest browser mode, Playwright provider)
- `bun run test:e2e` → `bunx playwright test` against Storybook at `localhost:6006`

These implementation details explain why Vitest and addon-vitest appear in the codebase — but you always invoke them via `bun run`, never directly.

---

## Test Archetypes

Five archetypes form a ladder from fastest to most realistic. **Always use the cheapest archetype that covers the risk.**

```
UNIT ──→ STORY-SMOKE ──→ STORY-INTERACT ──→ ACCEPTANCE ──→ LIVE-APP
 ms           ms            s                  s–min         min
No DOM    Render only   User events       Multi-step flow   Real app
```

### Archetype Comparison

| # | Name | File location | Runner | Target |
|---|------|--------------|--------|--------|
| 1 | UNIT | `src/**/*.test.ts` | `bun run test` | Pure logic, behaviors |
| 2 | STORY-SMOKE | `stories/**/*.stories.tsx` (no `play`) | `bun run test:storybook` | Renders without crash |
| 3 | STORY-INTERACT | `stories/**/*.stories.tsx` (with `play`) | `bun run test:storybook` | User interaction in browser |
| 4 | ACCEPTANCE | `e2e/**/*.e2e.ts` → `localhost:6006` | `bun run test:e2e` | Multi-step flow via Storybook |
| 5 | LIVE-APP | `e2e/**/*.e2e.ts` → real app URL | `bun run test:e2e` | Full user journey |

### Decision Tree

```
What are you testing?
│
├─ Pure logic / runtime behavior / parser rule / JIT strategy?
│  └── → UNIT
│
├─ Does a component render without crashing for given props?
│  └── → STORY-SMOKE  (automatic — every story export IS a smoke test)
│
├─ Does a component respond correctly to a user interaction?
│  (click, type, keyboard nav, state change within one component)
│  └── → STORY-INTERACT  (add play() to the story)
│
├─ Does a multi-step flow produce correct runtime state?
│  ├─ Can it be driven from a Storybook story?
│  │  └── → ACCEPTANCE  (Playwright against Storybook iframe)
│  └─ Does it need IndexedDB / real auth / multi-page navigation?
│     └── → LIVE-APP  (Playwright against running app)
│
└─ Fixing a bug?
   └── → Write a failing reproduction test FIRST (Prove-It Pattern)
       then pick the archetype that matches the scope of the bug
```

---

## Interface-Based Story Grouping

When multiple components implement the same interface (or fill the same role at different viewports / configurations), **group stories at the interface level**, not the component level.

### Directory Shape

```
stories/<layer>/<InterfaceName>/
  _contract.ts                  ← shared scenarios all implementations must pass
  ComponentA.stories.tsx        ← imports contract + component-A-specific stories
  ComponentB.stories.tsx        ← imports contract + component-B-specific stories
  ComponentC.stories.tsx        ← imports contract + component-C-specific stories
```

**Real-world example** — tracker panel rendered at three viewports all implement `ITrackerPanel`:

```
stories/panels/Tracker/
  _contract.ts
  Web.stories.tsx
  Mobile.stories.tsx
  Chromecast.stories.tsx
```

This replaces the current three top-level `TrackerWeb`, `TrackerMobile`, `TrackerChromecast` files that duplicate scenarios.

### The `_contract.ts` Pattern

Define the shared scenario set once. Each implementation file spreads them:

```typescript
// stories/panels/Tracker/_contract.ts
import type { StoryObj } from '@storybook/react';
import { within, expect, userEvent } from '@storybook/test';
import { TEST_IDS } from '../../_shared/TestIdContract';

// Shared args that apply to all Tracker implementations:
export const CONTRACT_ARGS = {
  script: '(21-15-9)\n  Thrusters @95lb\n  Pull-ups',
};

// Factory — takes a component-specific meta and returns contract stories.
// Import and spread into each implementing file.
export function trackerContractStories<T>(): Record<string, StoryObj<T>> {
  return {
    // SCENARIO 1: renders initial state
    ShowsInitialState: {
      args: CONTRACT_ARGS,
      play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('renders without error', async () => {
          await expect(canvas.getByTestId(TEST_IDS.TRACKER_PANEL)).toBeVisible();
        });
      },
    },

    // SCENARIO 2: shows current block info
    ShowsCurrentBlock: {
      args: CONTRACT_ARGS,
      play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('current block label is visible', async () => {
          await canvas.findByTestId(TEST_IDS.TIMER_DISPLAY);
        });
      },
    },
  };
}
```

```typescript
// stories/panels/Tracker/Mobile.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TrackerMobile } from '@/components/TrackerMobile';
import { trackerContractStories, CONTRACT_ARGS } from './_contract';

const meta: Meta<typeof TrackerMobile> = {
  title: 'panels/Tracker/Mobile',
  component: TrackerMobile,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof TrackerMobile>;

// ── Contract scenarios (must pass for all Tracker implementations) ──────────
export const { ShowsInitialState, ShowsCurrentBlock } =
  trackerContractStories<typeof TrackerMobile>();

// ── Mobile-specific scenarios ───────────────────────────────────────────────
export const SwipeGestureAdvances: Story = {
  args: CONTRACT_ARGS,
  play: async ({ canvasElement, step }) => {
    // Mobile-only interaction test
  },
};
```

### When to use interface-based grouping

Apply this pattern when **two or more** of the following are true:

- Multiple components render the same data/props shape
- Multiple viewport/platform variants of the same component exist
- A component is expected to be replaced or have multiple implementations
- You want to enforce a test contract (all implementations must pass the same scenarios)

### Story ID implications

Interface-grouped stories produce IDs like:

```
title: 'panels/Tracker/Mobile'  →  panels-tracker-mobile--shows-initial-state
title: 'panels/Tracker/Web'     →  panels-tracker-web--shows-initial-state
```

E2e tests that target a contract scenario across implementations can loop over story IDs:

```typescript
const TRACKER_IMPLEMENTATIONS = [
  'panels-tracker-web',
  'panels-tracker-mobile',
  'panels-tracker-chromecast',
];

for (const storyBase of TRACKER_IMPLEMENTATIONS) {
  test(`${storyBase}: renders initial state`, async ({ page }) => {
    await page.goto(
      `/iframe.html?id=${storyBase}--shows-initial-state&viewMode=story`
    );
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(TEST_IDS.TRACKER_PANEL)).toBeVisible();
  });
}
```

### DRY Rule for Tests

> Define **what** to test in `_contract.ts`. Define **how** to render it in each `Component.stories.tsx`. Never copy-paste a `play()` function across files.

If the same `play()` body appears in two story files, it belongs in `_contract.ts`.

---

## Archetype 1: UNIT

**File**: `src/**/*.test.ts`  
**Runner**: `bun run test`  
**Do NOT use for**: React components, DOM, or any visual state.

```typescript
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { RepBehavior } from '../RepBehavior';

it('decrements reps on next()', () => {
  const harness = new BehaviorTestHarness();
  const block = new MockBlock('test', [new RepBehavior(10)]);
  harness.push(block);
  harness.mount();
  harness.next();
  expect(block.getBehavior(RepBehavior)!.remaining()).toBe(9);
});
```

See `tests/harness/` and `docs/testing/block_isolation_testing_guide.md` for full harness API.

---

## Archetype 2: STORY-SMOKE

Every named story export is automatically run as a smoke test by `@storybook/addon-vitest`. No special code needed.

A story is a smoke test — it passes if the component renders without throwing.

```typescript
// Smoke test: just export the story, no play() required
export const Default: Story = { args: { value: 42 } };
```

---

## Archetype 3: STORY-INTERACT

**File**: `stories/**/*.stories.tsx`  
**Runner**: `bun run test:storybook`  
**Framework**: `@storybook/test` — `within`, `userEvent`, `expect`, `waitFor`  
**Use `test.step()`** equivalent: use `step()` from the play function args.

```typescript
import { within, userEvent, expect } from '@storybook/test';
import type { Meta, StoryObj } from '@storybook/react';
import { TimerControls } from '@/components/TimerControls';
import { TEST_IDS } from '../_shared/TestIdContract';

const meta: Meta<typeof TimerControls> = {
  title: 'catalog/organisms/TimerControls',
  component: TimerControls,
};
export default meta;
type Story = StoryObj<typeof TimerControls>;

export const StartsAndShowsRunning: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Initial state: stopped', async () => {
      await expect(canvas.getByTestId(TEST_IDS.TIMER_DISPLAY)).toHaveText('00:00');
      await expect(canvas.getByTestId(TEST_IDS.START_BUTTON)).toBeVisible();
    });

    await step('Click start: timer runs', async () => {
      await userEvent.click(canvas.getByTestId(TEST_IDS.START_BUTTON));
      await expect(canvas.getByTestId(TEST_IDS.STOP_BUTTON)).toBeVisible();
    });
  },
};
```

### Key APIs in @storybook/test (Storybook 10)

```typescript
import { within, userEvent, expect, waitFor, fn } from '@storybook/test';

within(canvasElement)         // Scope queries to the story's DOM root
userEvent.click(element)      // Simulated click with user-event semantics
userEvent.type(element, text) // Typed text
userEvent.keyboard('{Enter}') // Keyboard events
waitFor(() => expect(...))    // Poll assertion
fn()                          // Mock function for spying on args
```

### Story-level a11y configuration

```typescript
export const MyStory: Story = {
  parameters: {
    a11y: {
      // 'off' | 'todo' (warn) | 'error' (fail test)
      mode: 'error',
    },
  },
};
```

---

## Archetype 4: ACCEPTANCE

**File**: `e2e/**/*.e2e.ts`  
**Runner**: `bun run test:e2e`  
**Target**: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`  
**Use for**: Runtime state machine traversal, round transitions, metric inheritance, multi-step flows.

### Story ID Format

Storybook derives IDs from the title using kebab-case, with `--` separating category from story name:

```
title: 'Acceptance/Runtime CrossFit'  →  acceptance-runtime-crossfit--fran
title: 'Acceptance/Testing Workouts'  →  acceptance-testing-workouts--annie
```

Navigate to a story:
```typescript
await page.goto('/iframe.html?id=acceptance-runtime-crossfit--fran&viewMode=story');
```

### Acceptance Test Template

```typescript
import { test } from '@playwright/test';
import { RuntimeCrossFitPage } from '../pages/RuntimeCrossFitPage';
import { RuntimeAssertions } from '../utils/assertion-helpers';
import { extractRuntimeState } from '../utils/runtime-helpers';

test.describe('Fran — Round Transitions', () => {
  // Monitor console errors (always include this):
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.error('[pageerror]', err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('[console]', msg.text());
    });
  });

  test('progresses through all 3 rounds in correct rep order', async ({ page }) => {
    const demo = new RuntimeCrossFitPage(page);
    await demo.gotoWorkout('fran');

    await test.step('Round 1: Thrusters 21', async () => {
      await demo.clickNext();
      const state = await demo.getState();
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'R1 Thrusters');
      await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'R1');
    });

    await test.step('Round 1: Pull-ups 21', async () => {
      await demo.clickNext();
      const state = await demo.getState();
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'R1 Pull-ups');
    });

    await test.step('Completion after round 3', async () => {
      // Drive remaining steps...
      const finalState = await demo.getState();
      await RuntimeAssertions.expectWorkoutComplete(finalState, 'Fran');
    });

    await demo.screenshot('fran-complete');
  });
});
```

### Waiting for Runtime State

**Prefer `waitForFunction` over `waitForTimeout`:**

```typescript
// Good — wait for actual condition
await page.waitForFunction(() => {
  const btn = document.querySelector('[data-testid="next-block-button"]');
  return btn && !btn.textContent?.includes('Processing');
}, { timeout: 5000 });

// Bad — arbitrary sleep
await page.waitForTimeout(1000);  // avoid; use only when absolutely required
```

### Playwright 1.57 Specific Features to Leverage

```typescript
// Deterministic clock (no real timers):
await page.clock.install({ time: new Date('2025-01-01T12:00:00Z') });
await page.clock.tick(5000); // advance 5 seconds

// Soft assertions (continue after failure):
await expect.soft(locator).toHaveText('expected');

// Visual regression snapshot:
await expect(page).toHaveScreenshot('fran-after-round-1.png', {
  maxDiffPixelRatio: 0.02,
});

// Network mock:
await page.route('**/api/workouts', route =>
  route.fulfill({ json: { workouts: [] } })
);
```

---

## Archetype 5: LIVE-APP

**File**: `e2e/**/*.e2e.ts` (using `APP_URL` constant)  
**Runner**: `bun run test:e2e`  
**Use sparingly** — these tests are slow, fragile, and require real infrastructure.

Reserve for:
- Journal entry persistence (IndexedDB round-trips)
- Multi-page navigation flows
- Authentication flows (if added)

See `e2e/pages/JournalEntryPage.ts` for a reference page object that targets the live app.

---

## TestID Contract

All `data-testid` values **must** come from a shared contract. Never hardcode string selectors in tests.

**Location**: `stories/_shared/TestIdContract.ts` (create if not present)

```typescript
// stories/_shared/TestIdContract.ts
export const TEST_IDS = {
  // Workbench layout
  WORKBENCH_ROOT:        'workbench-root',
  EDITOR_PANEL:          'editor-panel',
  TRACKER_PANEL:         'tracker-panel',
  REVIEW_PANEL:          'review-panel',

  // View tabs
  VIEW_TAB_PLAN:         'view-tab-plan',
  VIEW_TAB_TRACK:        'view-tab-track',
  VIEW_TAB_REVIEW:       'view-tab-review',

  // Runtime controls
  NEXT_BLOCK_BUTTON:     'next-block-button',
  START_BUTTON:          'start-button',
  STOP_BUTTON:           'stop-button',

  // Runtime visualization
  RUNTIME_STACK:         'runtime-stack',
  MEMORY_VISUALIZATION:  'memory-visualization',
  TIMER_DISPLAY:         'timer-display',
} as const;

export type TestId = (typeof TEST_IDS)[keyof typeof TEST_IDS];
```

**In components:**
```tsx
<button data-testid={TEST_IDS.NEXT_BLOCK_BUTTON}>Next Block</button>
```

**In Playwright:**
```typescript
page.getByTestId(TEST_IDS.NEXT_BLOCK_BUTTON)
```

**In play() functions:**
```typescript
within(canvasElement).getByTestId(TEST_IDS.NEXT_BLOCK_BUTTON)
```

---

## Page Object Model

Every acceptance story that has e2e tests must have a corresponding Page Object in `e2e/pages/`.

### Page Object Template

```typescript
// e2e/pages/RuntimeCrossFitPage.ts
import { Page, Locator } from '@playwright/test';
import { extractRuntimeState, RuntimeState } from '../utils/runtime-helpers';
import { TEST_IDS } from '../../stories/_shared/TestIdContract';

export class RuntimeCrossFitPage {
  private readonly nextButton: Locator;

  constructor(private readonly page: Page) {
    this.nextButton = page.getByTestId(TEST_IDS.NEXT_BLOCK_BUTTON);
  }

  async gotoWorkout(name: 'fran' | 'annie' | 'barbara' | 'helen'): Promise<void> {
    await this.page.goto(
      `/iframe.html?id=acceptance-runtime-crossfit--${name}&viewMode=story`
    );
    await this.waitForReady();
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.nextButton.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="next-block-button"]');
        return btn && !btn.textContent?.includes('Processing');
      },
      { timeout: 5_000 }
    );
  }

  async getState(): Promise<RuntimeState> {
    return extractRuntimeState(this.page);
  }

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png` });
  }
}
```

---

## State Validation Patterns

### extractRuntimeState + RuntimeAssertions

Use these helpers from `e2e/utils/` for all state validation:

```typescript
import { extractRuntimeState } from '../utils/runtime-helpers';
import { RuntimeAssertions } from '../utils/assertion-helpers';

const state = await extractRuntimeState(page);

// Stack
await RuntimeAssertions.expectStackDepth(state.stack, 2, 'step label');
await RuntimeAssertions.expectCurrentBlockType(state.stack, 'Rep', 'step label');
await RuntimeAssertions.expectCurrentBlockName(state.stack, 'Thrusters', 'step label');
await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'step label');

// Memory
await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'step label');
await RuntimeAssertions.expectTotalRounds(state.memory, 3, 'step label');
await RuntimeAssertions.expectMemoryEntry(state.memory, 'rounds-current', 2, undefined, 'step label');

// Completion
await RuntimeAssertions.expectWorkoutComplete(state, 'workout name');
```

### test.step() for Trace Clarity

Always wrap validation inside `test.step()` to produce a readable trace in the Playwright HTML report:

```typescript
test('Fran - complete execution', async ({ page }) => {
  await test.step('Navigate + initialize', async () => {
    await page.goto('/iframe.html?id=acceptance-runtime-crossfit--fran&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  await test.step('Round 1, ex 1: Thrusters 21 reps', async () => {
    await demo.clickNext();
    const state = await demo.getState();
    await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'R1T');
    await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'R1T');
  });
  // ...
});
```

---

## Acceptance Story Structure

Stories that serve as e2e targets must follow this structure to be reliably navigable:

```typescript
// stories/acceptance/RuntimeCrossFit.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { RuntimeTestBench } from '@/components/RuntimeTestBench';
import { TEST_IDS } from '../_shared/TestIdContract';

const meta: Meta = {
  title: 'Acceptance/Runtime CrossFit',
  // ↑ Produces story IDs: acceptance-runtime-crossfit--fran, etc.
  component: RuntimeTestBench,
  parameters: {
    layout: 'fullscreen',
    // Suppress sidebar chrome for Playwright iframes
    docs: { disable: true },
  },
};
export default meta;
type Story = StoryObj;

export const Fran: Story = {
  args: { initialScript: '(21-15-9)\n  Thrusters @95lb\n  Pull-ups' },
  // Minimal play() verifies story renders correctly before Playwright takes over:
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId(TEST_IDS.NEXT_BLOCK_BUTTON)).toBeVisible();
  },
};

export const Annie: Story = {
  args: { initialScript: '(50-40-30-20-10)\n  Double-Unders\n  Sit-ups' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId(TEST_IDS.NEXT_BLOCK_BUTTON)).toBeVisible();
  },
};
```

---

## Visual Regression

For layout and UI changes, capture pixel-level snapshots. Baselines are stored in `e2e/screenshots/` (gitignored) or in `__snapshots__/` (committed).

```typescript
// Full-page snapshot
await expect(page).toHaveScreenshot('fran-initial.png', {
  maxDiffPixelRatio: 0.02,  // 2% tolerance for anti-aliasing
});

// Element-level snapshot
await expect(page.getByTestId(TEST_IDS.TRACKER_PANEL))
  .toHaveScreenshot('tracker-round-2.png');
```

**Update baselines after intentional UI changes:**
```bash
bun x playwright test --update-snapshots
```

---

## Regression Testing Checklist

When implementing a feature or fixing a bug:

- [ ] **UNIT**: Pure logic is covered — `bun run test` passes with no new failures
- [ ] **STORY-SMOKE**: New stories render — `bun run test:storybook` passes
- [ ] **STORY-INTERACT**: User-visible state changes have `play()` functions
- [ ] **ACCEPTANCE**: Multi-step flows are driven by e2e tests — `bun run test:e2e` passes
- [ ] **Bug fix**: Failing reproduction test written before fix (Prove-It Pattern)
- [ ] **Visual**: `--update-snapshots` run if intentional UI changed
- [ ] **TestIds**: New interactive elements use `TEST_IDS` contract, not inline strings

---

## CI/CD Order of Operations

```
1. bun run test              # Unit (src/**/*.test.ts) — ~3s
2. bun run storybook &       # Start Storybook server (background)
3. bun run test:storybook    # Story smoke + interaction — ~30s
4. bun run test:e2e          # Acceptance e2e — ~2min
5. bun run build-storybook   # Build validation — NEVER cancel
```

### Flakiness Prevention Rules

1. **Never use `waitForTimeout` as a primary wait** — use `waitForFunction`, `waitForSelector`, or `waitFor` on a locator
2. **Always `waitForLoadState('networkidle')`** before extracting runtime state from Storybook stories
3. **Use `test.step()`** for all multi-step flows so failures identify the exact state transition
4. **Use `page.getByTestId()`** over CSS class selectors — classes change, testids don't
5. **Monitor console errors** in every `test.beforeEach` block
6. **Use `expect.soft()`** for non-critical assertions that shouldn't abort the test

### Parallelism

- Unit tests: fully parallel (Bun handles this automatically)
- Story tests: controlled by `@vitest/browser` worker instances (see `vitest.storybook.config.js`)
- E2E tests: `fullyParallel: true` in `playwright.config.ts`; `workers: 1` on CI to prevent port conflicts

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Story ID mismatch between test and title | Derive ID with: `title.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-') + '--' + storyName.toLowerCase()` |
| Hardcoded `data-testid` strings in tests | Use `TEST_IDS` from `TestIdContract.ts` |
| `waitForTimeout(1000)` for runtime init | Use `waitForFunction` watching for the `NEXT_BLOCK_BUTTON` to appear |
| No `play()` on acceptance stories | Add minimal `play()` that verifies the story renders; Playwright then takes over |
| Tests target `runtime-crossfit--fran` but story doesn't exist | Story title must be `'Acceptance/Runtime CrossFit'` and named export must be `Fran` |
| Missing console error monitoring | Add `page.on('pageerror', ...)` and `page.on('console', ...)` in `beforeEach` |
