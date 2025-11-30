/**
 * Runtime Testing Infrastructure
 * 
 * This module provides tools for testing IRuntimeBlock implementations
 * by wrapping them with testable wrappers that track method calls,
 * memory operations, and stack changes.
 * 
 * @example
 * ```typescript
 * import { TestableBlock, TestableRuntime, TestableBlockHarness } from '@/runtime/testing';
 * 
 * // Wrap a real block for testing
 * const testableBlock = new TestableBlock(realBlock, {
 *   testId: 'my-test-block',
 *   nextMode: 'spy'
 * });
 * 
 * // Wrap runtime to track operations
 * const testRuntime = new TestableRuntime(realRuntime, {
 *   initialMemory: [{ type: 'metric:reps', ownerId: 'parent', value: 21 }]
 * });
 * 
 * // Take snapshots and diff
 * const before = testRuntime.snapshot('before');
 * testableBlock.mount(testRuntime);
 * const after = testRuntime.snapshot('after');
 * const diff = testRuntime.diff(before, after);
 * ```
 */

// Core testing classes
export { 
  TestableBlock,
  createTestableBlock,
  type TestableBlockConfig,
  type InterceptMode,
  type MethodCall,
  type MemoryOperation,
  type StackOperation
} from './TestableBlock';

export {
  TestableRuntime,
  createTestableRuntime,
  type TestableRuntimeConfig,
  type InitialMemoryEntry,
  type InitialStackEntry,
  type RuntimeSnapshot,
  type SnapshotDiff
} from './TestableRuntime';

// Harness component for Storybook
export {
  TestableBlockHarness,
  type TestableBlockHarnessProps,
  type TestScenario,
  type ScenarioResult
} from './TestableBlockHarness';

// Visualization components
export {
  SnapshotDiffViewer,
  SnapshotDiffSummary,
  ModifiedValuesViewer,
  BlockTestScenarioBuilder,
  type BlockTestScenarioBuilderProps,
  type ScenarioDefinition,
  type ScenarioExecutionResult
} from './components';

// Test setup actions
export * from './actions';

