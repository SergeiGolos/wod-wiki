import { Page } from '@playwright/test';

/**
 * Runtime inspection utilities for extracting and validating
 * runtime state from the JitCompilerDemo component
 */

export interface RuntimeState {
  stack: RuntimeStackState;
  memory: MemoryState;
  timer?: TimerState;
  script: ScriptState;
}

export interface RuntimeStackState {
  blocks: RuntimeBlock[];
  currentIndex: number;
  depth: number;
}

export interface RuntimeBlock {
  key: string;
  displayName: string;
  blockType: string;
  depth: number;
  metrics: Metric[];
  isActive: boolean;
}

export interface Metric {
  type: string;
  value: string | number;
  unit?: string;
}

export interface MemoryState {
  entries: MemoryEntry[];
  totalAllocated: number;
  summary: {
    byType: Record<string, number>;
    byOwner: Record<string, number>;
  };
}

export interface MemoryEntry {
  id: string;
  type: string;
  ownerId: string;
  value: any;
  isValid: boolean;
  children: number;
}

export interface TimerState {
  isRunning: boolean;
  elapsedMs: number;
  totalMs?: number;
  displayText: string;
}

export interface ScriptState {
  content: string;
  parsedFragments: any[];
  isValid: boolean;
}

/**
 * Extract complete runtime state from the page
 */
export async function extractRuntimeState(page: Page): Promise<RuntimeState> {
  return await page.evaluate(() => {
    const state: RuntimeState = {
      stack: extractStackState(),
      memory: extractMemoryStateInBrowser(),
      timer: extractTimerStateInBrowser(),
      script: extractScriptState()
    };
    return state;
  });
}

/**
 * Extract runtime stack state
 */
export async function extractStackState(page: Page): Promise<RuntimeStackState> {
  return await page.evaluate(() => {
    return extractStackStateInBrowser();
  });
}

/**
 * Extract memory state
 */
export async function extractMemoryState(page: Page): Promise<MemoryState> {
  return await page.evaluate(() => {
    return extractMemoryState();
  });
}

/**
 * Extract timer state
 */
export async function extractTimerState(page: Page): Promise<TimerState | undefined> {
  return await page.evaluate(() => {
    return extractTimerState();
  });
}

/**
 * Extract script state
 */
export async function extractScriptState(page: Page): Promise<ScriptState> {
  return await page.evaluate(() => {
    return extractScriptState();
  });
}

/**
 * Validate runtime state against expected values
 */
export function validateRuntimeState(
  actual: RuntimeState,
  expected: Partial<RuntimeState>,
  context: string = ''
): ValidationResult {
  const errors: string[] = [];

  // Validate stack
  if (expected.stack) {
    const stackErrors = validateStackState(actual.stack, expected.stack);
    errors.push(...stackErrors.map(err => `Stack: ${err}`));
  }

  // Validate memory
  if (expected.memory) {
    const memoryErrors = validateMemoryState(actual.memory, expected.memory);
    errors.push(...memoryErrors.map(err => `Memory: ${err}`));
  }

  // Validate timer
  if (expected.timer) {
    const timerErrors = validateTimerState(actual.timer, expected.timer);
    errors.push(...timerErrors.map(err => `Timer: ${err}`));
  }

  return {
    isValid: errors.length === 0,
    errors,
    context
  };
}

/**
 * Wait for runtime state to match expected criteria
 */
export async function waitForRuntimeState(
  page: Page,
  predicate: (state: RuntimeState) => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<RuntimeState> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const state = await extractRuntimeState(page);
    if (predicate(state)) {
      return state;
    }
    await page.waitForTimeout(interval);
  }

  throw new Error(`Runtime state did not match predicate within ${timeout}ms`);
}

/**
 * Wait for specific memory entry to exist
 */
export async function waitForMemoryEntry(
  page: Page,
  type: string,
  ownerId?: string,
  timeout: number = 5000
): Promise<MemoryEntry> {
  const state = await waitForRuntimeState(
    page,
    (state) => {
      const entry = state.memory.entries.find(e =>
        e.type === type && (!ownerId || e.ownerId === ownerId)
      );
      return !!entry;
    },
    timeout
  );

  const entry = state.memory.entries.find(e =>
    e.type === type && (!ownerId || e.ownerId === ownerId)
  );

  if (!entry) {
    throw new Error(`Memory entry not found: type=${type}, ownerId=${ownerId}`);
  }

  return entry;
}

/**
 * Wait for stack to reach specific depth
 */
export async function waitForStackDepth(
  page: Page,
  expectedDepth: number,
  timeout: number = 5000
): Promise<RuntimeStackState> {
  const state = await waitForRuntimeState(
    page,
    (state) => state.stack.depth === expectedDepth,
    timeout
  );

  return state.stack;
}

/**
 * Wait for workout completion
 */
export async function waitForWorkoutCompletion(
  page: Page,
  timeout: number = 30000
): Promise<RuntimeState> {
  return await waitForRuntimeState(
    page,
    (state) => {
      // Workout is complete when stack is empty and completion status is set
      const isStackEmpty = state.stack.depth === 0;
      const completionEntry = state.memory.entries.find(e => e.type === 'completion-status');
      const isComplete = completionEntry?.value === true || completionEntry?.value === 'true';

      return isStackEmpty && isComplete;
    },
    timeout
  );
}

// Internal helper functions (run in browser context)

function extractStackStateInBrowser(): RuntimeStackState {
  const stackContainer = document.querySelector('[data-testid="runtime-stack"], .runtime-stack, .stack-visualization');
  if (!stackContainer) {
    return { blocks: [], currentIndex: -1, depth: 0 };
  }

  const blockElements = stackContainer.querySelectorAll('[data-block], .runtime-block, .block');
  const blocks: RuntimeBlock[] = [];
  let currentIndex = -1;

  blockElements.forEach((blockEl, index) => {
    const element = blockEl as HTMLElement;
    const isActive = element.classList.contains('active') ||
      element.classList.contains('current') ||
      element.hasAttribute('data-active') ||
      element.querySelector('[data-active="true"]') !== null;

    if (isActive) {
      currentIndex = index;
    }

    blocks.push({
      key: element.getAttribute('data-key') || element.id || `block-${index}`,
      displayName: element.querySelector('[data-display-name]')?.textContent ||
        element.querySelector('.display-name')?.textContent ||
        element.textContent?.split('\n')[0] || '',
      blockType: element.getAttribute('data-block-type') ||
        element.getAttribute('data-type') ||
        element.className.split(' ').find(cls => cls.includes('block')) || '',
      depth: parseInt(element.getAttribute('data-depth') || element.style.marginLeft?.replace('px', '') || '0') / 12, // Assuming 12px indent per level
      metrics: extractBlockMetrics(element),
      isActive
    });
  });

  return {
    blocks,
    currentIndex,
    depth: blocks.length
  };
}

function extractBlockMetrics(blockElement: HTMLElement): Metric[] {
  const metrics: Metric[] = [];
  const metricElements = blockElement.querySelectorAll('[data-metric], .metric, .metric-value');

  metricElements.forEach((metricEl) => {
    const element = metricEl as HTMLElement;
    const type = element.getAttribute('data-type') ||
      element.getAttribute('data-metric-type') ||
      element.className.split(' ').find(cls => cls.includes('metric')) || '';

    const value = element.getAttribute('data-value') ||
      element.getAttribute('data-metric-value') ||
      element.textContent || '';

    const unit = element.getAttribute('data-unit') ||
      element.getAttribute('data-metric-unit') || '';

    // Try to parse numeric values
    const numericValue = parseFloat(value);
    const finalValue = isNaN(numericValue) ? value : numericValue;

    metrics.push({
      type,
      value: finalValue,
      unit: unit || undefined
    });
  });

  return metrics;
}

function extractMemoryStateInBrowser(): MemoryState {
  const memoryContainer = document.querySelector('[data-testid="memory-visualization"], .memory-visualization, .memory');
  if (!memoryContainer) {
    return { entries: [], totalAllocated: 0, summary: { byType: {}, byOwner: {} } };
  }

  const entries: MemoryEntry[] = [];
  const entryElements = memoryContainer.querySelectorAll('[data-memory-entry], .memory-entry, .memory-item');

  entryElements.forEach((entryEl) => {
    const element = entryEl as HTMLElement;
    const rawValue = element.getAttribute('data-value') ||
      element.getAttribute('data-raw-value') ||
      element.textContent || '';

    // Try to parse JSON values
    let parsedValue: any = rawValue;
    try {
      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        parsedValue = JSON.parse(rawValue);
      } else if (!isNaN(Number(rawValue))) {
        parsedValue = Number(rawValue);
      } else if (rawValue === 'true' || rawValue === 'false') {
        parsedValue = rawValue === 'true';
      }
    } catch {
      // Keep as string if parsing fails
    }

    entries.push({
      id: element.getAttribute('data-id') || element.id || '',
      type: element.getAttribute('data-type') || element.getAttribute('data-memory-type') || '',
      ownerId: element.getAttribute('data-owner') || element.getAttribute('data-owner-id') || '',
      value: parsedValue,
      isValid: !element.classList.contains('invalid') && !element.classList.contains('error'),
      children: parseInt(element.getAttribute('data-children') || '0')
    });
  });

  const totalAllocated = parseInt(memoryContainer.getAttribute('data-total-allocated') || entries.length.toString());

  // Build summary
  const byType: Record<string, number> = {};
  const byOwner: Record<string, number> = {};

  entries.forEach(entry => {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    byOwner[entry.ownerId] = (byOwner[entry.ownerId] || 0) + 1;
  });

  return {
    entries,
    totalAllocated,
    summary: { byType, byOwner }
  };
}

function extractTimerStateInBrowser(): TimerState | undefined {
  const timerContainer = document.querySelector('[data-testid="timer-display"], .timer-display, .timer, .clock');
  if (!timerContainer) {
    return undefined;
  }

  const element = timerContainer as HTMLElement;
  const displayText = element.textContent || '';

  return {
    isRunning: element.getAttribute('data-running') === 'true' ||
      element.classList.contains('running') ||
      displayText.includes('running'),
    elapsedMs: parseInt(element.getAttribute('data-elapsed') || '0'),
    totalMs: parseInt(element.getAttribute('data-total') || '0'),
    displayText
  };
}

function extractScriptStateInBrowser(): ScriptState {
  const scriptContainer = document.querySelector('[data-testid="script-editor"], .script-editor, .monaco-editor');
  if (!scriptContainer) {
    return { content: '', parsedFragments: [], isValid: false };
  }

  // Try to extract script content
  const content = scriptContainer.querySelector('.view-lines')?.textContent ||
    scriptContainer.textContent || '';

  // Try to extract parsed fragments
  const fragmentContainer = document.querySelector('[data-testid="parsed-fragments"], .parsed-fragments, .fragments');
  const parsedFragments = fragmentContainer ?
    Array.from(fragmentContainer.querySelectorAll('[data-fragment], .fragment')).map(el => ({
      type: el.getAttribute('data-type') || '',
      content: el.textContent || ''
    })) : [];

  return {
    content,
    parsedFragments,
    isValid: parsedFragments.length > 0 || content.trim().length > 0
  };
}

function validateStackState(actual: RuntimeStackState, expected: Partial<RuntimeStackState>): string[] {
  const errors: string[] = [];

  if (expected.depth !== undefined && actual.depth !== expected.depth) {
    errors.push(`Expected depth ${expected.depth}, got ${actual.depth}`);
  }

  if (expected.currentIndex !== undefined && actual.currentIndex !== expected.currentIndex) {
    errors.push(`Expected current index ${expected.currentIndex}, got ${actual.currentIndex}`);
  }

  if (expected.blocks && expected.blocks.length > 0) {
    expected.blocks.forEach((expectedBlock, index) => {
      if (index >= actual.blocks.length) {
        errors.push(`Expected block at index ${index}, but only ${actual.blocks.length} blocks exist`);
        return;
      }

      const actualBlock = actual.blocks[index];

      if (expectedBlock.blockType && actualBlock.blockType !== expectedBlock.blockType) {
        errors.push(`Block ${index}: expected type ${expectedBlock.blockType}, got ${actualBlock.blockType}`);
      }

      if (expectedBlock.displayName && actualBlock.displayName !== expectedBlock.displayName) {
        errors.push(`Block ${index}: expected name ${expectedBlock.displayName}, got ${actualBlock.displayName}`);
      }
    });
  }

  return errors;
}

function validateMemoryState(actual: MemoryState, expected: Partial<MemoryState>): string[] {
  const errors: string[] = [];

  if (expected.totalAllocated !== undefined && actual.totalAllocated !== expected.totalAllocated) {
    errors.push(`Expected ${expected.totalAllocated} allocated entries, got ${actual.totalAllocated}`);
  }

  if (expected.entries) {
    expected.entries.forEach((expectedEntry) => {
      const actualEntry = actual.entries.find(e =>
        e.type === expectedEntry.type &&
        (!expectedEntry.ownerId || e.ownerId === expectedEntry.ownerId)
      );

      if (!actualEntry) {
        errors.push(`Missing memory entry: type=${expectedEntry.type}, owner=${expectedEntry.ownerId}`);
        return;
      }

      if (expectedEntry.value !== undefined && actualEntry.value !== expectedEntry.value) {
        errors.push(`Memory entry ${expectedEntry.type}: expected value ${expectedEntry.value}, got ${actualEntry.value}`);
      }
    });
  }

  return errors;
}

function validateTimerState(actual: TimerState | undefined, expected: TimerState): string[] {
  const errors: string[] = [];

  if (!actual) {
    errors.push('Timer state is undefined');
    return errors;
  }

  if (expected.isRunning !== undefined && actual.isRunning !== expected.isRunning) {
    errors.push(`Expected timer running=${expected.isRunning}, got ${actual.isRunning}`);
  }

  if (expected.elapsedMs !== undefined && Math.abs(actual.elapsedMs - expected.elapsedMs) > 1000) {
    errors.push(`Expected elapsed ${expected.elapsedMs}ms, got ${actual.elapsedMs}ms`);
  }

  return errors;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  context: string;
}