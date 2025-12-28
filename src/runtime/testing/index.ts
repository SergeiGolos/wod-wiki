/**
 * Runtime Testing Infrastructure
 * 
 * This module provides tools for testing IRuntimeBlock implementations
 * by wrapping them with testable wrappers that track method calls,
 * memory operations, and stack changes.
 * 
 * ## Custom Wrapper for Debug Tracking
 * 
 * Provide a custom wrapper via options to track wrapped blocks:
 * 
 * ```typescript
 * import { ScriptRuntime, RuntimeStackWrapper } from '@/runtime';
 * import { TestableBlock } from '@/testing';
 * 
 * const wrappedBlocks = new Map<string, TestableBlock>();
 * 
 * const wrapper: RuntimeStackWrapper = {
 *   wrap: (block) => {
 *     const wrapped = new TestableBlock(block, { testId: `debug-${block.key}` });
 *     wrappedBlocks.set(block.key.toString(), wrapped);
 *     return wrapped;
 *   },
 *   cleanup: (block) => wrappedBlocks.delete(block.key.toString()),
 * };
 * 
 * const runtime = new ScriptRuntime(script, compiler, { wrapper });
 * 
 * // Execute workout...
 * 
 * // Inspect wrapped blocks
 * for (const [key, block] of wrappedBlocks) {
 *   console.log(`${key}: mount called ${block.callCount('mount')} times`);
 * }
 * ```
 * 
 * ## Manual Testing
 * 
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
 * 
 * ## Queue-Based Testing
 * 
 * For interactive testing with step-by-step execution:
 * 
 * ```typescript
 * import { QueueTestHarness, TestTemplate } from '@/testing';
 * 
 * // Use built-in templates or create custom ones
 * const customTemplate: TestTemplate = {
 *   id: 'my-test',
 *   name: 'My Test',
 *   description: 'Test custom behavior',
 *   wodScript: '5 Pullups',
 *   queue: [
 *     { type: 'push', label: 'Push Block', statementIndex: 0 },
 *     { type: 'mount', label: 'Mount' },
 *     { type: 'next', label: 'Advance' }
 *   ]
 * };
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

// Visualization components
export {
  SnapshotDiffViewer,
  SnapshotDiffSummary,
  ModifiedValuesViewer,
  QueueTestHarness,
  type QueueTestHarnessProps,
  type QueueAction,
  type TestTemplate
} from './components';

// Test setup actions
export * from './actions';
