// Phase 1: MockJitCompiler
export { MockJitCompiler } from './MockJitCompiler';
export type { CompileCall, BlockMatcher } from './MockJitCompiler';

// Phase 2: ExecutionContextTestHarness
export { ExecutionContextTestHarness } from './ExecutionContextTestHarness';
export type { ActionExecution, EventDispatch, HarnessConfig } from './ExecutionContextTestHarness';

// Phase 3: Builder & Factory Methods
export { ExecutionContextTestBuilder } from './ExecutionContextTestBuilder';
export type { BlockMatcherPredicate, BlockOrFactory } from './ExecutionContextTestBuilder';
export {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness
} from './factory';
export type {
  TimerTestConfig,
  BehaviorTestConfig,
  BasicTestConfig
} from './factory';

// Existing harnesses
export { BehaviorTestHarness } from './BehaviorTestHarness';
export { MockBlock } from './MockBlock';
export { RuntimeTestBuilder, RuntimeTestHarness } from './RuntimeTestBuilder';
export { WorkoutTestHarness, WorkoutTestBuilder } from './WorkoutTestHarness';
export type { RuntimeSnapshot, MemoryEntry } from './RuntimeTestBuilder';
export type { WorkoutReport } from './WorkoutTestHarness';
