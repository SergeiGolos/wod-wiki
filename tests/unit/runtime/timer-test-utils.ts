import { vi } from 'vitest';

/**
 * Mock timer for controlling time in tests.
 * Replaces performance.now() and allows precise time advancement.
 */
export class MockTimer {
  private currentTime = 0;
  private originalNow: typeof performance.now;

  constructor(initialTime = 0) {
    this.currentTime = initialTime;
    this.originalNow = performance.now;
  }

  /**
   * Returns the current mock time in milliseconds.
   */
  now(): number {
    return this.currentTime;
  }

  /**
   * Advances the mock timer by the specified milliseconds.
   */
  advance(ms: number): void {
    this.currentTime += ms;
  }

  /**
   * Resets the mock timer to zero.
   */
  reset(): void {
    this.currentTime = 0;
  }

  /**
   * Sets the mock timer to a specific time.
   */
  setTime(ms: number): void {
    this.currentTime = ms;
  }

  /**
   * Installs this mock timer, replacing performance.now().
   * Returns a cleanup function to restore original.
   */
  install(): () => void {
    const mockNow = this.now.bind(this);
    vi.spyOn(performance, 'now').mockImplementation(mockNow);

    return () => {
      vi.restoreAllMocks();
    };
  }
}

/**
 * Creates and installs a mock timer for testing.
 * Returns the mock timer and cleanup function.
 */
export function mockPerformanceNow(initialTime = 0): { 
  timer: MockTimer; 
  cleanup: () => void 
} {
  const timer = new MockTimer(initialTime);
  const cleanup = timer.install();
  return { timer, cleanup };
}

/**
 * Waits for a specified number of timer ticks (intervals).
 * Useful for testing setInterval-based timers.
 */
export async function waitForTicks(count: number, intervalMs = 100): Promise<void> {
  return new Promise(resolve => {
    let tickCount = 0;
    const interval = setInterval(() => {
      tickCount++;
      if (tickCount >= count) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}

/**
 * Advances fake timers and processes microtasks.
 * Useful when using vi.useFakeTimers().
 */
export async function advanceFakeTimers(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await vi.runAllTicks();
  await Promise.resolve(); // Process microtasks
}

/**
 * Flushes all pending timers and microtasks.
 */
export async function flushTimers(): Promise<void> {
  await vi.runAllTimersAsync();
  await Promise.resolve();
}

/**
 * Creates a controlled interval that can be manually triggered.
 * Useful for testing timer behaviors without real time delays.
 */
export class ControlledInterval {
  private callback: () => void;
  private intervalId: number | null = null;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  /**
   * Manually triggers the interval callback.
   */
  tick(): void {
    this.callback();
  }

  /**
   * Triggers the callback multiple times.
   */
  tickMultiple(count: number): void {
    for (let i = 0; i < count; i++) {
      this.callback();
    }
  }

  /**
   * Starts the real interval (for integration testing).
   */
  start(ms: number): void {
    if (this.intervalId !== null) {
      throw new Error('Interval already started');
    }
    this.intervalId = setInterval(this.callback, ms) as any;
  }

  /**
   * Stops the interval.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Creates a controlled interval for testing.
 */
export function createControlledInterval(callback: () => void): ControlledInterval {
  return new ControlledInterval(callback);
}
