/**
 * RuntimeFactory - Service for creating ScriptRuntime instances
 * 
 * This factory encapsulates the runtime creation logic, decoupling it from
 * UI components like WorkbenchContext. It handles:
 * - WodScript creation from block content
 * - ScriptRuntime instantiation with JIT compiler
 * - Root block compilation and mounting
 * - Optional debug mode enabling
 * 
 * @example
 * ```typescript
 * const factory = new RuntimeFactory(globalCompiler);
 * const runtime = factory.createRuntime(wodBlock);
 * 
 * // With debug mode
 * const debugRuntime = factory.createRuntime(wodBlock, { debugMode: true });
 * ```
 */

import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeMemory } from '../RuntimeMemory';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';
import { JitCompiler } from './JitCompiler';
import { WodScript } from '../../parser/WodScript';
import type { WodBlock } from '../../markdown-editor/types';
import { WorkoutRootStrategy } from './strategies/WorkoutRootStrategy';
import { IRuntimeOptions } from '../contracts/IRuntimeOptions';
import type { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * Interface for runtime factory implementations
 * Allows for dependency injection and testing
 */
export interface IRuntimeFactory {
  /**
   * Creates a new ScriptRuntime from a WodBlock
   * @param block - The WOD block containing workout script and parsed statements
   * @param options - Optional runtime options (debug mode, logging, etc.)
   * @returns A fully initialized ScriptRuntime, or null if block has no statements
   */
  createRuntime(block: WodBlock, options?: IRuntimeOptions): IScriptRuntime | null;

  /**
   * Disposes of a runtime and cleans up resources
   * @param runtime - The runtime to dispose
   */
  disposeRuntime(runtime: IScriptRuntime): void;
}

/**
 * Default implementation of IRuntimeFactory
 */
export class RuntimeFactory implements IRuntimeFactory {
  constructor(private readonly compiler: JitCompiler) { }

  /**
   * Creates a new ScriptRuntime from a WodBlock
   * 
   * Process:
   * 1. Validates block has statements
   * 2. Creates WodScript from content + statements
   * 3. Instantiates ScriptRuntime with JIT compiler and options
   * 4. Creates a Root RuntimeBlock that wraps all top-level statements
   * 5. Pushes root block to stack and mounts it
   * 
   * @param block - The WOD block to create runtime for
   * @param options - Optional runtime options (debug mode, logging, etc.)
   * @returns Initialized ScriptRuntime or null if invalid block
   */
  createRuntime(block: WodBlock, options?: IRuntimeOptions): IScriptRuntime | null {
    if (!block.statements || block.statements.length === 0) {
      return null;
    }



    // Create WodScript from block content and statements
    const script = new WodScript(block.content, block.statements);

    // Instantiate dependencies
    const stack = new RuntimeStack();
    const clock = new RuntimeClock();
    const eventBus = new EventBus();

    const dependencies = {
      stack,
      clock,
      eventBus
    };

    // Create runtime with JIT compiler and optional debug options
    const runtime = new ScriptRuntime(script, this.compiler, dependencies, options);

    // Create Root Block using WorkoutRootStrategy
    // This uses decomposed single-responsibility behaviors instead of monolithic RootLifecycleBehavior

    const statementIds = block.statements.map((s: any) => s.id);
    // Map each top-level statement to a group so they execute in sequence
    const childGroups = statementIds.map((id: number) => [id]);

    // Use WorkoutRootStrategy to compose the root block with all required behaviors
    const rootStrategy = new WorkoutRootStrategy();
    const rootBlock = rootStrategy.build(runtime, {
      childGroups: childGroups,
      totalRounds: 1
    });

    // Push root block with a shared start timestamp for deterministic timing
    const rootStartTime = runtime.clock.now;
    const lifecycle = { startTime: rootStartTime };
    runtime.pushBlock(rootBlock, lifecycle);

    return runtime;
  }

  /**
   * Disposes of a runtime, cleaning up all blocks and resources
   * 
   * @param runtime - The runtime to dispose
   */
  disposeRuntime(runtime: IScriptRuntime): void {

    runtime.dispose();
  }
}

/**
 * Creates a default RuntimeFactory with the global compiler
 * Useful for quick setup in components
 * 
 * @deprecated Use explicit RuntimeFactory construction with a JitCompiler instance
 * to avoid coupling to testbench services.
 */
export async function createDefaultRuntimeFactory(): Promise<RuntimeFactory> {
  // Dynamic import to avoid circular dependency and browser compatibility
  const { globalCompiler } = await import('../../runtime-test-bench/services/testbench-services');
  return new RuntimeFactory(globalCompiler);
}
