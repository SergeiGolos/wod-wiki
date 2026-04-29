// Core runtime interfaces — only symbols consumed externally via this barrel.
// All other contracts should be imported directly from their source files.
export type { IScriptRuntime } from './IScriptRuntime';
export type { IJitCompiler } from './IJitCompiler';
export type { IRuntimeBlock, BlockLifecycleOptions } from './IRuntimeBlock';
export type { IRuntimeAction } from './IRuntimeAction';
export type { IRuntimeBehavior } from './IRuntimeBehavior';
export type { IRuntimeStack, Unsubscribe, StackSnapshot, StackObserver } from './IRuntimeStack';
export type { IRuntimeClock } from './IRuntimeClock';
export type { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
export type { IBlockContext } from './IBlockContext';
export type { IMemoryReference } from './IMemoryReference';

// Event interfaces — used externally via this barrel
export type { IEvent } from './events/IEvent';
export type { IEventBus } from './events/IEventBus';

// Concrete implementation re-exported for consumers that need the value (not just the type).
export { TypedMemoryReference } from '../impl/TypedMemoryReference';
