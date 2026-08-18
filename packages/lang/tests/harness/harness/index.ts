// Mock infrastructure
export { MockJitCompiler } from '../harness/MockJitCompiler';
export type { CompileCall, BlockMatcher } from '../harness/MockJitCompiler';

// ExecutionContext testing (Phase 2 — will collapse into BehaviorTestHarness in Phase D)
export { ExecutionContextTestHarness } from '../harness/ExecutionContextTestHarness';
export type { ActionExecution, EventDispatch, HarnessConfig } from '../harness/ExecutionContextTestHarness';

// Builder & Factory Methods
export { ExecutionContextTestBuilder } from '../harness/ExecutionContextTestBuilder';
export type { BlockMatcherPredicate, BlockOrFactory } from '../harness/ExecutionContextTestBuilder';
export {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness
} from '../harness/factory';
export type {
  TimerTestConfig,
  BehaviorTestConfig,
  BasicTestConfig
} from '../harness/factory';

// Behavior-level testing

// Generic runtime testing
export { RuntimeTestHarness, RuntimeTestBuilder } from '../harness/RuntimeTestBuilder';
export type { MemoryEntry } from '../harness/RuntimeTestBuilder';
export { BehaviorTestHarness } from '../harness/BehaviorTestHarness';
export { StrategyTestHarness, AppliedStrategy, apply, stmtWith, makeStatement, stubRuntime } from '../harness/StrategyTestHarness';
export type { AppliedStrategy as AppliedStrategyView } from '../harness/StrategyTestHarness';
export { MockBlock } from '../harness/MockBlock';
export type { MockBlockConfig, BehaviorContextRecordings } from '../harness/MockBlock';

// Effort Registry mocks
export { MockEffortResolver } from '../harness/MockEffortResolver';
