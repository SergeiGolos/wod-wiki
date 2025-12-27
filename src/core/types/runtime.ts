/**
 * Runtime types for WOD Wiki
 * 
 * These types define the runtime execution engine interfaces including
 * script runtime, blocks, actions, memory, and compilation strategies.
 */

import { IRuntimeMemory, RuntimeError, IMetricCollector, IEvent } from '@/core-entry'; import { RuntimeStack, JitCompiler } from '.';
import { IScript, IBlockKey, ICodeStatement } from './core';


/**
 * Main runtime execution context for workout scripts
 */
export interface IScriptRuntime {
  readonly script: IScript;
  readonly memory: IRuntimeMemory;
  readonly stack: RuntimeStack;
  readonly jit: JitCompiler;

  /** Errors collected during runtime execution */
  readonly errors?: RuntimeError[];

  /** Metrics collection subsystem for workout analytics */
  readonly metrics?: IMetricCollector;

  handle(event: IEvent): void;

  dispose(): void;
}

/**
 * Represents a runtime block that can be executed within the WOD runtime stack
 */
export interface IRuntimeBlock {
  /** Unique identifier for this block instance */
  readonly key: IBlockKey;

  /** Source code location identifiers */
  readonly sourceIds: number[];

  /** Type discriminator for UI display and logging */
  readonly blockType?: string;

  /** Called when this block is pushed onto the runtime stack */
  mount(runtime: IScriptRuntime): IRuntimeAction[];

  /** Called when a child block completes execution */
  next(runtime: IScriptRuntime): IRuntimeAction[];

  /** Called when this block is popped from the runtime stack */
  unmount(runtime: IScriptRuntime): IRuntimeAction[];

  /** Cleans up any resources held by this block */
  dispose(runtime: IScriptRuntime): void;
}

/**
 * Interface for actions that can be performed by the runtime in response to events
 */
export interface IRuntimeAction {
  /** Type of action to perform */
  type: string;

  /** Target of the action (optional) */
  target?: string;

  /** Action payload/data */
  payload?: unknown;

  /** Executes the action within the given runtime context */
  do(runtime: IScriptRuntime): void;
}

/**
 * Search criteria for finding memory references
 */
export type MemorySearchCriteria = {
  id: string | null;
  ownerId: string | null;
  type: string | null;
  visibility: 'public' | 'private' | null;
};

/**
 * Memory reference that can be typed
 */
export interface IMemoryReference {
  readonly id: string;
  readonly ownerId: string;
  readonly type: string;
  readonly visibility: 'public' | 'private';
}

/**
 * Typed memory reference for type-safe memory access
 */
export interface TypedMemoryReference<T> extends IMemoryReference {
  readonly __type?: T;
}

/**
 * Strategy pattern for compiling code statements into runtime blocks
 */
export interface IRuntimeBlockStrategy {
  /** Check if this strategy can handle the given statements */
  match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;

  /** Compile statements into a runtime block */
  compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined;
}

/**
 * Re-export key runtime types
 */
export type { IScriptRuntime as ScriptRuntime } from '@/runtime/IScriptRuntime';
export type { IRuntimeBlock as RuntimeBlock } from '@/runtime/IRuntimeBlock';
export type { IRuntimeAction as RuntimeAction } from '@/runtime/IRuntimeAction';
export type { IRuntimeMemory as RuntimeMemory } from '@/runtime/IRuntimeMemory';
export type { RuntimeStack } from '@/runtime/RuntimeStack';
export type { JitCompiler } from '@/runtime/JitCompiler';
export type { IRuntimeBlockStrategy as RuntimeBlockStrategy } from '@/runtime/IRuntimeBlockStrategy';
export type { ICodeStatement } from './core';
