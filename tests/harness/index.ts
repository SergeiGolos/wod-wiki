/**
 * Test Harness Namespace
 *
 * Unified testing infrastructure for WOD Wiki runtime tests.
 * Use these utilities instead of inline mocks for consistent, maintainable tests.
 *
 * ## Quick Start
 *
 * ### Unit Testing Behaviors
 * ```typescript
 * import { describe, it, expect, beforeEach } from 'bun:test';
 * import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
 * import { TimerBehavior } from '../TimerBehavior';
 *
 * describe('TimerBehavior', () => {
 *   let harness: BehaviorTestHarness;
 *
 *   beforeEach(() => {
 *     harness = new BehaviorTestHarness()
 *       .withClock(new Date('2024-01-01T12:00:00Z'));
 *   });
 *
 *   it('should start timer on mount', () => {
 *     const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
 *     harness.push(block);
 *     harness.mount();
 *     expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
 *   });
 *
 *   it('should track elapsed time', () => {
 *     const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
 *     harness.push(block).mount();
 *     harness.advanceClock(5000);
 *     expect(block.getBehavior(TimerBehavior)!.getElapsedMs()).toBeGreaterThanOrEqual(5000);
 *   });
 *
 *   it('should emit events', () => {
 *     const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
 *     harness.push(block).mount();
 *     expect(harness.wasEventEmitted('timer:started')).toBe(true);
 *   });
 * });
 * ```
 *
 * ### Integration Testing Strategies
 * ```typescript
 * import { describe, it, expect } from 'bun:test';
 * import { RuntimeTestBuilder } from '../harness';
 * import { TimerStrategy } from '@/runtime/compiler/strategies';
 *
 * describe('TimerStrategy', () => {
 *   it('should compile timer block from script', () => {
 *     const harness = new RuntimeTestBuilder()
 *       .withScript('10:00 Run')
 *       .withStrategy(new TimerStrategy())
 *       .build();
 *
 *     const block = harness.pushStatement(0);
 *     expect(block.blockType).toBe('Timer');
 *     expect(harness.stackDepth).toBe(1);
 *   });
 * });
 * ```
 *
 * ## Running Harness Tests
 * ```bash
 * bun test tests/harness --preload ./tests/unit-setup.ts
 * ```
 *
 * ## See Also
 * - tests/NAMING_CONVENTIONS.md - Full API documentation
 * - docs/plan/test-harness-implementation.md - Implementation status
 */

// Core harness classes
export { MockBlock, type MockBlockConfig } from './MockBlock';
export {
  BehaviorTestHarness,
  createBehaviorHarness,
  type CapturedAction,
  type CapturedEvent
} from './BehaviorTestHarness';
export {
  RuntimeTestBuilder,
  RuntimeTestHarness,
  type RuntimeSnapshot,
  type MemoryEntry,
  type SnapshotDiff
} from './RuntimeTestBuilder';

// Assertion helpers (Phase 4 - not yet implemented)
// export * from './assertions';
