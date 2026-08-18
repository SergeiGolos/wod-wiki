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

// Consumer-facing contracts required by app-level runtime integrations (#970
// cutover parity): memory, event provider, behavior context, and testable
// config surfaces that were part of the pre-extraction umbrella's API.
export type { IRuntimeMemory } from './IRuntimeMemory';
export type { IRuntimeEventProvider } from './IRuntimeEventProvider';
export type { IAnchorValue } from './IAnchorValue';
export type {
  IBehaviorContext,
  BehaviorEventListener,
  BehaviorEventType,
  SubscribeOptions,
} from './IBehaviorContext';
export type { IRuntimeActionable } from './primitives/IRuntimeActionable';
export type { InterceptMode, TestableBlockConfig } from './ITestableBlockConfig';
export type { StackEvent } from './IRuntimeStack';
export { DEFAULT_RUNTIME_OPTIONS } from './IRuntimeOptions';
export type { RuntimeStackOptions } from './IRuntimeOptions';
export type { StackListener } from './IRuntimeStack';
export type { EventCallback, EventHandlerOptions } from './events/IEventBus';
export type { OutputListener } from './IScriptRuntime';
