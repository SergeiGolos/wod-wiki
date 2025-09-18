export type { IRepeatingBlockBehavior, LoopState } from './IRepeatingBlockBehavior';
export type { IPromotePublicBehavior } from './IPromotePublicBehavior';
export type { IPublicSpanBehavior } from './IPublicSpanBehavior';
export type { IInheritMetricsBehavior } from './IInheritMetricsBehavior';
export type { IBehavior } from './IBehavior';

// New behavior interfaces from specification
export type { IAllocateChildrenBehavior } from './IAllocateChildrenBehavior';
export type { IAllocateIndexBehavior } from './IAllocateIndexBehavior';
export type { INextChildBehavior } from './INextChildBehavior';
export type { INoLoopBehavior } from './INoLoopBehavior';
export type { IBoundLoopBehavior } from './IBoundLoopBehavior';
export type { IDurationEventBehavior } from './IDurationEventBehavior';
export type { ICompleteEventBehavior } from './ICompleteEventBehavior';
export type { IOnEventEndBehavior } from './IOnEventEndBehavior';
export type { IPopOnNextBehavior } from './IPopOnNextBehavior';
export type { IStopOnPopBehavior } from './IStopOnPopBehavior';
export type { IJournalOnPopBehavior } from './IJournalOnPopBehavior';
export type { IEndOnPopBehavior } from './IEndOnPopBehavior';
export type { IAllocateMetricsBehavior } from './IAllocateMetricsBehavior';
export type { IAllocateSpanBehavior } from './IAllocateSpanBehavior';

export { runOnPush, runOnNext, runOnPop } from './runBehaviorHooks';

// Concrete behavior classes
export { AllocateChildrenBehavior } from './AllocateChildrenBehavior';
export { AllocateIndexBehavior } from './AllocateIndexBehavior';
export { NextChildBehavior } from './NextChildBehavior';
export { NoLoopBehavior } from './NoLoopBehavior';
export { BoundLoopBehavior } from './BoundLoopBehavior';
export { DurationEventBehavior } from './DurationEventBehavior';
export { CompleteEventBehavior } from './CompleteEventBehavior';
export { OnEventEndBehavior } from './OnEventEndBehavior';
export { PopOnNextBehavior } from './PopOnNextBehavior';
export { StopOnPopBehavior } from './StopOnPopBehavior';
export { JournalOnPopBehavior } from './JournalOnPopBehavior';
export { EndOnPopBehavior } from './EndOnPopBehavior';
export { AllocateMetricsBehavior } from './AllocateMetricsBehavior';
export { AllocateSpanBehavior } from './AllocateSpanBehavior';