/**
 * @deprecated Compatibility shim for legacy deep imports.
 *
 * `core/types/runtime` is no longer part of the `@/core` or `wod-wiki/types`
 * barrels. Import from `@/runtime/contracts` (or the concrete runtime modules)
 * instead. This file forwards to the canonical runtime definitions so old deep
 * imports keep resolving without carrying duplicate placeholder types.
 */

export type { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
export type { IRuntimeBlock, BlockLifecycleOptions } from '../../runtime/contracts/IRuntimeBlock';
export type { IRuntimeAction } from '../../runtime/contracts/IRuntimeAction';
export type { IRuntimeMemory, MemorySearchCriteria } from '../../runtime/contracts/IRuntimeMemory';
export type { IMemoryReference } from '../../runtime/contracts/IMemoryReference';
export type { TypedMemoryReference } from '../../runtime/impl/TypedMemoryReference';
export type { IRuntimeBlockStrategy } from '../../runtime/contracts/IRuntimeBlockStrategy';
export type { IRuntimeBehavior } from '../../runtime/contracts/IRuntimeBehavior';
export type { IBlockContext } from '../../runtime/contracts/IBlockContext';
export type { IRuntimeStack } from '../../runtime/contracts/IRuntimeStack';
export type { IRuntimeClock } from '../../runtime/contracts/IRuntimeClock';
export type { IEvent } from '../../runtime/contracts/events/IEvent';
export type { IEventBus } from '../../runtime/contracts/events/IEventBus';
export type { IEventHandler } from '../../runtime/contracts/events/IEventHandler';

export type { RuntimeStack } from '../../runtime/RuntimeStack';
export type { JitCompiler } from '../../runtime/compiler/JitCompiler';
export type { ScriptRuntime } from '../../runtime/ScriptRuntime';
export type { RuntimeBlock } from '../../runtime/RuntimeBlock';
export type { RuntimeMemory } from '../../runtime/RuntimeMemory';
export type { BlockContext } from '../../runtime/BlockContext';

export type { IScriptRuntime as ScriptRuntimeInterface } from '../../runtime/contracts/IScriptRuntime';
export type { IRuntimeBlock as RuntimeBlockInterface } from '../../runtime/contracts/IRuntimeBlock';
export type { IRuntimeAction as RuntimeActionInterface } from '../../runtime/contracts/IRuntimeAction';
export type { IRuntimeMemory as RuntimeMemoryInterface } from '../../runtime/contracts/IRuntimeMemory';
export type { IRuntimeBlockStrategy as RuntimeBlockStrategyInterface } from '../../runtime/contracts/IRuntimeBlockStrategy';

export type { ICodeStatement } from './core';
