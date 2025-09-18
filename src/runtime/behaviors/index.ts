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