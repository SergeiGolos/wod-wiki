import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from '../IRuntimeAction';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IBlockContext } from '../IBlockContext';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * Configuration for method interception behavior
 */
export type InterceptMode = 
  | 'passthrough'  // Call underlying method normally
  | 'spy'          // Call method and record arguments/return
  | 'override'     // Replace with custom implementation
  | 'ignore';      // Skip method call entirely

/**
 * Recorded method call for inspection
 */
export interface MethodCall {
  method: keyof IRuntimeBlock;
  args: any[];
  returnValue?: any;
  timestamp: number;
  duration: number;
  error?: Error;
}

/**
 * Memory operation recorded during block execution
 */
export interface MemoryOperation {
  operation: 'allocate' | 'get' | 'set' | 'release' | 'search';
  type: string;
  ownerId: string;
  refId?: string;
  value?: any;
  timestamp: number;
}

/**
 * Stack operation recorded during block execution
 */
export interface StackOperation {
  operation: 'push' | 'pop';
  blockKey: string;
  blockType?: string;
  timestamp: number;
}

/**
 * Configuration for TestableBlock behavior
 */
export interface TestableBlockConfig {
  /** Custom ID for easy identification in visualizations */
  testId?: string;
  
  /** Custom label override for display purposes */
  labelOverride?: string;
  
  /** Mode for mount() interception */
  mountMode?: InterceptMode;
  /** Custom mount implementation when mode is 'override' */
  mountOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for next() interception */
  nextMode?: InterceptMode;
  /** Custom next implementation when mode is 'override' */
  nextOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for unmount() interception */
  unmountMode?: InterceptMode;
  /** Custom unmount implementation when mode is 'override' */
  unmountOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for dispose() interception */
  disposeMode?: InterceptMode;
  /** Custom dispose implementation when mode is 'override' */
  disposeOverride?: (runtime: IScriptRuntime) => void;
}

/**
 * A custom BlockKey that allows overriding the string representation
 * for easier identification in visualizations.
 */
class TestableBlockKey extends BlockKey {
  constructor(private readonly _testId: string) {
    super();
  }
  
  override toString(): string {
    return this._testId;
  }
}

/**
 * TestableBlock wraps any IRuntimeBlock to enable:
 * - Method interception (spy, override, ignore)
 * - Call recording for assertions
 * - Custom test IDs for easy identification
 * 
 * @example
 * ```typescript
 * const realBlock = new EffortBlock(runtime, [1], { exerciseName: 'Squats', targetReps: 10 });
 * const testable = new TestableBlock(realBlock, {
 *   testId: 'effort-squats-1',
 *   nextMode: 'spy',
 *   mountOverride: () => [] // Skip default mount actions
 * });
 * 
 * // Execute and inspect
 * testable.mount(runtime);
 * console.log(testable.calls); // All recorded method calls
 * console.log(testable.key.toString()); // 'effort-squats-1'
 * ```
 */
export class TestableBlock implements IRuntimeBlock {
  private _calls: MethodCall[] = [];
  private _config: Required<TestableBlockConfig>;
  private _testKey: BlockKey;
  
  constructor(
    private readonly _wrapped: IRuntimeBlock,
    config: TestableBlockConfig = {}
  ) {
    // Apply defaults
    this._config = {
      testId: config.testId ?? '',
      labelOverride: config.labelOverride ?? '',
      mountMode: config.mountMode ?? 'spy',
      mountOverride: config.mountOverride ?? (() => []),
      nextMode: config.nextMode ?? 'spy',
      nextOverride: config.nextOverride ?? (() => []),
      unmountMode: config.unmountMode ?? 'spy',
      unmountOverride: config.unmountOverride ?? (() => []),
      disposeMode: config.disposeMode ?? 'spy',
      disposeOverride: config.disposeOverride ?? (() => {}),
    };
    
    // Create custom key if testId provided, otherwise use wrapped key
    this._testKey = this._config.testId 
      ? new TestableBlockKey(this._config.testId)
      : this._wrapped.key;
  }
  
  // ========== IRuntimeBlock Properties ==========
  
  get key(): BlockKey {
    return this._testKey;
  }
  
  get sourceIds(): number[] {
    return this._wrapped.sourceIds;
  }
  
  get blockType(): string | undefined {
    return this._wrapped.blockType;
  }
  
  get label(): string {
    return this._config.labelOverride || this._wrapped.label;
  }
  
  get context(): IBlockContext {
    return this._wrapped.context;
  }
  
  get compiledMetrics(): RuntimeMetric | undefined {
    return this._wrapped.compiledMetrics;
  }
  
  // ========== Testing API ==========
  
  /** Access the underlying block for direct inspection */
  get wrapped(): IRuntimeBlock {
    return this._wrapped;
  }
  
  /** The test ID assigned to this block */
  get testId(): string {
    return this._config.testId;
  }
  
  /** All recorded method calls */
  get calls(): ReadonlyArray<MethodCall> {
    return [...this._calls];
  }
  
  /** Get calls for a specific method */
  getCallsFor(method: keyof IRuntimeBlock): MethodCall[] {
    return this._calls.filter(c => c.method === method);
  }
  
  /** Get the most recent call for a method */
  getLastCall(method: keyof IRuntimeBlock): MethodCall | undefined {
    const calls = this.getCallsFor(method);
    return calls[calls.length - 1];
  }
  
  /** Check if a method was called */
  wasCalled(method: keyof IRuntimeBlock): boolean {
    return this._calls.some(c => c.method === method);
  }
  
  /** Get call count for a method */
  callCount(method: keyof IRuntimeBlock): number {
    return this.getCallsFor(method).length;
  }
  
  /** Clear recorded calls */
  clearCalls(): void {
    this._calls = [];
  }
  
  // ========== IRuntimeBlock Methods (intercepted) ==========
  
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    return this._intercept('mount', runtime, this._config.mountMode, () => {
      if (this._config.mountMode === 'override') {
        return this._config.mountOverride(runtime);
      }
      return this._wrapped.mount(runtime);
    });
  }
  
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    return this._intercept('next', runtime, this._config.nextMode, () => {
      if (this._config.nextMode === 'override') {
        return this._config.nextOverride(runtime);
      }
      return this._wrapped.next(runtime);
    });
  }
  
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    return this._intercept('unmount', runtime, this._config.unmountMode, () => {
      if (this._config.unmountMode === 'override') {
        return this._config.unmountOverride(runtime);
      }
      return this._wrapped.unmount(runtime);
    });
  }
  
  dispose(runtime: IScriptRuntime): void {
    this._intercept('dispose', runtime, this._config.disposeMode, () => {
      if (this._config.disposeMode === 'override') {
        this._config.disposeOverride(runtime);
        return;
      }
      this._wrapped.dispose(runtime);
    });
  }
  
  getBehavior<B extends IRuntimeBehavior>(
    behaviorType: new (...args: any[]) => B
  ): B | undefined {
    return this._wrapped.getBehavior(behaviorType);
  }
  
  // ========== Private Helpers ==========
  
  private _intercept<R>(
    method: keyof IRuntimeBlock,
    runtime: IScriptRuntime,
    mode: InterceptMode,
    execute: () => R
  ): R {
    const startTime = performance.now();
    const call: MethodCall = {
      method,
      args: [runtime],
      timestamp: Date.now(),
      duration: 0,
    };
    
    try {
      if (mode === 'ignore') {
        call.returnValue = method === 'dispose' ? undefined : [];
        return call.returnValue as R;
      }
      
      const result = execute();
      call.returnValue = result;
      return result;
    } catch (error) {
      call.error = error as Error;
      throw error;
    } finally {
      call.duration = performance.now() - startTime;
      this._calls.push(call);
    }
  }
}

/**
 * Factory function to create a TestableBlock with a simple test ID
 */
export function createTestableBlock(
  wrapped: IRuntimeBlock,
  testId: string,
  config: Omit<TestableBlockConfig, 'testId'> = {}
): TestableBlock {
  return new TestableBlock(wrapped, { ...config, testId });
}
