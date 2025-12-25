/**
 * Test Harness Namespace
 *
 * Unified testing infrastructure for WOD Wiki runtime tests.
 *
 * ## Usage
 *
 * ### Unit Testing (Behaviors)
 * ```typescript
 * // From src/runtime/behaviors/__tests__/
 * import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
 *
 * const harness = new BehaviorTestHarness().withClock(new Date());
 * const block = new MockBlock('test', [new TimerBehavior('up')]);
 * harness.push(block).mount();
 * ```
 *
 * ### Integration Testing (Blocks)
 * ```typescript
 * // From tests/integration/
 * import { RuntimeTestBuilder } from '../harness';
 *
 * const harness = new RuntimeTestBuilder()
 *   .withScript('3 Rounds\n  10 Pushups')
 *   .withStrategy(new RoundsStrategy())
 *   .build();
 *
 * harness.pushStatement(0);
 * ```
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

// Assertion helpers
// export * from './assertions'; // Will be enabled in Phase 4
