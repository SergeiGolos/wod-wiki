import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for JitCompilerDemo component in Storybook
 * Provides methods to interact with and inspect runtime execution state
 */
export class JitCompilerDemoPage {
  private readonly page: Page;

  // Main selectors
  private readonly nextButton: Locator;
  private readonly scriptEditor: Locator;
  private readonly runtimeStack: Locator;
  private readonly memoryVisualization: Locator;
  private readonly timerDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole('button', { name: /Next Block/i });
    this.scriptEditor = page.locator('[data-testid="script-editor"], .monaco-editor');
    this.runtimeStack = page.locator('[data-testid="runtime-stack"], .runtime-stack');
    this.memoryVisualization = page.locator('[data-testid="memory-visualization"], .memory-visualization');
    this.timerDisplay = page.locator('[data-testid="timer-display"], .timer-display');
  }

  /**
   * Navigate to a specific workout story in Storybook
   */
  async gotoWorkout(workoutName: string): Promise<void> {
    const storyId = this.getStoryId(workoutName);
    await this.page.goto(`/iframe.html?id=runtime-crossfit--${storyId}&viewMode=story`);
  }

  /**
   * Wait for the runtime to be fully initialized
   */
  async waitForRuntimeReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Allow runtime initialization

    // Wait for Next Block button to be visible
    await this.nextButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Set the workout script in the editor
   */
  async setScript(script: string): Promise<void> {
    // Click on the editor to focus it
    await this.scriptEditor.click();

    // Clear existing content and type new script
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Delete');
    await this.page.keyboard.type(script);

    // Wait for script parsing
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the current script content
   */
  async getScript(): Promise<string> {
    // This might need adjustment based on Monaco editor structure
    const editor = this.page.locator('.monaco-editor .view-lines');
    return await editor.textContent() || '';
  }

  /**
   * Click the Next Block button
   */
  async clickNextBlock(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Get the current text of the Next Block button
   */
  async getNextButtonText(): Promise<string> {
    return await this.nextButton.textContent() || '';
  }

  /**
   * Wait for processing to complete after clicking Next Block
   */
  async waitForProcessingComplete(timeout: number = 5000): Promise<void> {
    // Wait for button text to change back from "Processing..."
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('button:has-text("Next Block")');
        return button && !button.textContent?.includes('Processing');
      },
      { timeout }
    );
  }

  /**
   * Get the current runtime stack information
   */
  async getRuntimeStack(): Promise<RuntimeStackInfo> {
    const stackElement = await this.runtimeStack.elementHandle();
    if (!stackElement) {
      return { blocks: [], currentIndex: -1 };
    }

    const stackData = await stackElement.evaluate((el) => {
      // Extract stack information from the DOM
      const blockElements = el.querySelectorAll('[data-block], .runtime-block');
      const blocks: RuntimeBlockInfo[] = [];
      let currentIndex = -1;

      blockElements.forEach((blockEl, index) => {
        const blockElement = blockEl as HTMLElement;
        const isActive = blockElement.classList.contains('active') ||
                        blockElement.querySelector('[data-active="true"]');

        if (isActive) {
          currentIndex = index;
        }

        blocks.push({
          displayName: blockElement.querySelector('[data-display-name]')?.textContent || '',
          blockType: blockElement.getAttribute('data-block-type') || '',
          depth: parseInt(blockElement.getAttribute('data-depth') || '0'),
          key: blockElement.getAttribute('data-key') || '',
          metrics: this.extractMetrics(blockElement)
        });
      });

      return { blocks, currentIndex };
    });

    return stackData;
  }

  /**
   * Get memory snapshot information
   */
  async getMemorySnapshot(): Promise<MemorySnapshot> {
    const memoryElement = await this.memoryVisualization.elementHandle();
    if (!memoryElement) {
      return { entries: [], totalAllocated: 0 };
    }

    return await memoryElement.evaluate((el) => {
      const entries: MemoryEntry[] = [];
      const entryElements = el.querySelectorAll('[data-memory-entry], .memory-entry');

      entryElements.forEach((entryEl) => {
        const entryElement = entryEl as HTMLElement;
        entries.push({
          id: entryElement.getAttribute('data-id') || '',
          type: entryElement.getAttribute('data-type') || '',
          owner: entryElement.getAttribute('data-owner') || '',
          value: entryElement.getAttribute('data-value') || '',
          isValid: !entryElement.classList.contains('invalid'),
          children: parseInt(entryElement.getAttribute('data-children') || '0')
        });
      });

      const totalAllocated = parseInt(el.getAttribute('data-total-allocated') || '0');

      return { entries, totalAllocated };
    });
  }

  /**
   * Get timer state information
   */
  async getTimerState(): Promise<TimerState | null> {
    const timerElement = await this.timerDisplay.elementHandle();
    if (!timerElement) {
      return null;
    }

    return await timerElement.evaluate((el) => {
      return {
        isRunning: el.getAttribute('data-running') === 'true',
        elapsedMs: parseInt(el.getAttribute('data-elapsed') || '0'),
        totalMs: parseInt(el.getAttribute('data-total') || '0'),
        displayText: el.textContent || ''
      };
    });
  }

  /**
   * Get information about the current block
   */
  async getCurrentBlockInfo(): Promise<RuntimeBlockInfo | null> {
    const stack = await this.getRuntimeStack();
    if (stack.currentIndex >= 0 && stack.currentIndex < stack.blocks.length) {
      return stack.blocks[stack.currentIndex];
    }
    return null;
  }

  /**
   * Assert stack depth
   */
  async expectStackDepth(expectedDepth: number): Promise<void> {
    const stack = await this.getRuntimeStack();
    if (stack.blocks.length !== expectedDepth) {
      throw new Error(`Expected stack depth ${expectedDepth}, but got ${stack.blocks.length}`);
    }
  }

  /**
   * Assert current round
   */
  async expectCurrentRound(expectedRound: number): Promise<void> {
    const memory = await this.getMemorySnapshot();
    const roundsEntry = memory.entries.find(entry => entry.type === 'rounds-current');
    const actualRound = roundsEntry ? parseInt(roundsEntry.value) : 0;

    if (actualRound !== expectedRound) {
      throw new Error(`Expected current round ${expectedRound}, but got ${actualRound}`);
    }
  }

  /**
   * Assert current reps
   */
  async expectReps(expectedReps: number): Promise<void> {
    const currentBlock = await this.getCurrentBlockInfo();
    if (!currentBlock) {
      throw new Error('No current block found');
    }

    const repsMetric = currentBlock.metrics.find(m => m.type === 'reps');
    const actualReps = repsMetric ? parseInt(repsMetric.value || '0') : 0;

    if (actualReps !== expectedReps) {
      throw new Error(`Expected reps ${expectedReps}, but got ${actualReps}`);
    }
  }

  /**
   * Assert workout completion
   */
  async expectWorkoutComplete(): Promise<void> {
    const stack = await this.getRuntimeStack();
    if (stack.blocks.length > 0) {
      throw new Error(`Expected empty stack for completed workout, but found ${stack.blocks.length} blocks`);
    }

    const memory = await this.getMemorySnapshot();
    const completionEntry = memory.entries.find(entry => entry.type === 'completion-status');
    const isComplete = completionEntry ? completionEntry.value === 'true' : false;

    if (!isComplete) {
      throw new Error('Workout completion status not set to true');
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }

  // Private helper methods

  private getStoryId(workoutName: string): string {
    const storyMap: Record<string, string> = {
      'Fran': 'fran',
      'Annie': 'annie',
      'Barbara': 'barbara',
      'Chelsea': 'chelsea',
      'Cindy': 'cindy',
      'Diane': 'diane',
      'Elizabeth': 'elizabeth',
      'Helen': 'helen',
      'Linda': 'linda',
      'Mary': 'mary',
      'Nancy': 'nancy'
    };

    return storyMap[workoutName] || workoutName.toLowerCase();
  }

  private extractMetrics(blockElement: HTMLElement): MetricInfo[] {
    const metrics: MetricInfo[] = [];
    const metricElements = blockElement.querySelectorAll('[data-metric], .metric');

    metricElements.forEach((metricEl) => {
      const element = metricEl as HTMLElement;
      metrics.push({
        type: element.getAttribute('data-type') || '',
        value: element.getAttribute('data-value') || '',
        unit: element.getAttribute('data-unit') || ''
      });
    });

    return metrics;
  }
}

// Type definitions

export interface RuntimeStackInfo {
  blocks: RuntimeBlockInfo[];
  currentIndex: number;
}

export interface RuntimeBlockInfo {
  displayName: string;
  blockType: string;
  depth: number;
  key: string;
  metrics: MetricInfo[];
}

export interface MetricInfo {
  type: string;
  value: string;
  unit?: string;
}

export interface MemorySnapshot {
  entries: MemoryEntry[];
  totalAllocated: number;
}

export interface MemoryEntry {
  id: string;
  type: string;
  owner: string;
  value: string;
  isValid: boolean;
  children: number;
}

export interface TimerState {
  isRunning: boolean;
  elapsedMs: number;
  totalMs: number;
  displayText: string;
}