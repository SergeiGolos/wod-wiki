// Core runtime interfaces — only symbols consumed externally via this barrel.
export type { IScriptRuntime } from './IScriptRuntime';
export type { IJitCompiler } from './IJitCompiler';
export type { IRuntimeBlock, BlockLifecycleOptions, CompletionDecision } from './IRuntimeBlock';
export type { IRuntimeAction } from './IRuntimeAction';
export type { IRuntimeBehavior } from './IRuntimeBehavior';
export type { IRuntimeStack, Unsubscribe, StackSnapshot, StackObserver } from './IRuntimeStack';
export type { IRuntimeClock } from './IRuntimeClock';
export type { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
export type { IBlockContext } from './IBlockContext';
export type { IMemoryReference } from './IMemoryReference';

// Subscription contracts
export type { IRuntimeSubscription } from './IRuntimeSubscription';
export type { ICastSubscription } from './ICastSubscription';
export { isCastSubscription } from './ICastSubscription';

// Event interfaces
export type { IEvent } from './events/IEvent';
export type { IEventHandler } from './events/IEventHandler';
export type { IEventBus } from './events/IEventBus';

// Concrete implementation re-exported for consumers that need the value (not just the type).
export { TypedMemoryReference } from '../impl/TypedMemoryReference';
