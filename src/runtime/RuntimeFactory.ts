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

import { ScriptRuntime } from './ScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { WodScript } from '../parser/WodScript';
import type { WodBlock } from '../markdown-editor/types';
import { RuntimeBlock } from './RuntimeBlock';
import { BlockContext } from './BlockContext';
import { BlockKey } from '../core/models/BlockKey';
import { LoopType } from './behaviors/LoopCoordinatorBehavior';
import { IRuntimeBehavior } from './IRuntimeBehavior';
import { RootLifecycleBehavior } from './behaviors/RootLifecycleBehavior';
import { TimerBehavior } from './behaviors/TimerBehavior';
import { IRuntimeOptions } from './IRuntimeOptions';
import { captureRuntimeTimestamp } from './RuntimeClock';

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
  createRuntime(block: WodBlock, options?: IRuntimeOptions): ScriptRuntime | null;
  
  /**
   * Disposes of a runtime and cleans up resources
   * @param runtime - The runtime to dispose
   */
  disposeRuntime(runtime: ScriptRuntime): void;
}

/**
 * Default implementation of IRuntimeFactory
 */
export class RuntimeFactory implements IRuntimeFactory {
  constructor(private readonly compiler: JitCompiler) {}

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
  createRuntime(block: WodBlock, options?: IRuntimeOptions): ScriptRuntime | null {
    if (!block.statements || block.statements.length === 0) {
      console.warn('[RuntimeFactory] Cannot create runtime: block has no statements');
      return null;
    }


    
    // Create WodScript from block content and statements
    const script = new WodScript(block.content, block.statements);
    
    // Create runtime with JIT compiler and optional debug options
    const runtime = new ScriptRuntime(script, this.compiler, options);
    
    // Create Root Block manually
    // This ensures we always have a root grouping node that walks all children once
    
    const statementIds = block.statements.map(s => s.id);
    // Map each top-level statement to a group so they execute in sequence
    const childGroups = statementIds.map(id => [id]); 
    
    const blockKey = new BlockKey('root');
    // Use 'root' as blockId and exerciseId for the root context
    const context = new BlockContext(runtime, blockKey.toString(), 'root');
    
    const behaviors: IRuntimeBehavior[] = [];
    
    // Root uses RootLifecycleBehavior to manage the full workout lifecycle
    // (Initial Idle -> Execution -> Final Idle)
    const rootBehavior = new RootLifecycleBehavior({
        childGroups: childGroups,
        loopType: LoopType.FIXED,
        totalRounds: 1
    });
    behaviors.push(rootBehavior);
    
    // Add TimerBehavior to root block and start it immediately for the overall runtime clock
    // Use 'up' direction (count up) for the main workout timer
    behaviors.push(new TimerBehavior('up', undefined, 'Workout Timer', 'secondary', true));
    
    // Note: CompletionBehavior is no longer needed as RootLifecycleBehavior handles completion
    
    const rootBlock = new RuntimeBlock(
        runtime,
        statementIds,
        behaviors,
        context,
        blockKey,
        "Root",
        "Workout"
    );
    
    if (!rootBlock) {
      console.warn('[RuntimeFactory] Failed to create root block for:', block.id);
      return runtime; // Return runtime even without root block for debugging
    }

    // Push and mount root block with a shared start timestamp for deterministic timing
    const rootStartTime = captureRuntimeTimestamp(runtime.clock);
    const lifecycle = { startTime: rootStartTime };
    runtime.stack.push(rootBlock, lifecycle);
    const actions = rootBlock.mount(runtime, lifecycle);
    actions.forEach(action => action.do(runtime));
    

    return runtime;
  }

  /**
   * Disposes of a runtime, cleaning up all blocks and resources
   * 
   * @param runtime - The runtime to dispose
   */
  disposeRuntime(runtime: ScriptRuntime): void {

    runtime.disposeAllBlocks();
  }
}

/**
 * Creates a default RuntimeFactory with the global compiler
 * Useful for quick setup in components
 */
export function createDefaultRuntimeFactory(): RuntimeFactory {
  // Import here to avoid circular dependency
  const { globalCompiler } = require('../runtime-test-bench/services/testbench-services');
  return new RuntimeFactory(globalCompiler);
}
