// Core runtime interfaces
export type { IScriptRuntime } from './IScriptRuntime';
export type { IRuntimeBlock, BlockLifecycleOptions } from './IRuntimeBlock';
export type { IRuntimeAction } from './IRuntimeAction';
export type { IRuntimeBehavior } from './IRuntimeBehavior';
export type { IRuntimeMemory, MemorySearchCriteria, Nullable } from './IRuntimeMemory';
export type { IRuntimeStack, Unsubscribe, StackSnapshot, StackObserver, StackEvent, StackListener } from './IRuntimeStack';
export type { IRuntimeClock } from './IRuntimeClock';
export type { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
export type { IRuntimeOptions, RuntimeStackOptions, RuntimeStackHooks, RuntimeStackLogger, RuntimeStackWrapper, RuntimeStackTracker, DebugLogEvent, DebugLogEventType, BlockWrapperFactory } from './IRuntimeOptions';
export type { IBlockContext } from './IBlockContext';
export type { IMemoryReference } from './IMemoryReference';
export type { IAnchorValue } from './IAnchorValue';
export type { IDistributedMetrics } from './IDistributedMetrics';

// Concrete implementations re-exported from impl/ for backward compatibility
// with existing import sites. The classes live outside contracts/ to keep
// this layer free of implementation code and to break dependency cycles.
export { TypedMemoryReference } from '../impl/TypedMemoryReference';
export { PassthroughMetricDistributor } from '../impl/PassthroughMetricDistributor';

// Primitive interfaces (interface-segregation layer)
export type { IRuntimeActionable, IBlockRef, IMemoryEntryShim } from './primitives';

// Subscription & Event Provider interfaces
export type { IRuntimeSubscription } from './IRuntimeSubscription';
export type { IRuntimeEventProvider } from './IRuntimeEventProvider';

// Event interfaces
export * from './events';
