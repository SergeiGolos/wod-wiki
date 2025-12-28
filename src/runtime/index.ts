export * from './ScriptRuntime';
export * from './RuntimeBuilder';
export * from './contracts/IRuntimeOptions';
export * from './events/StackEvents';
export * from './events/MemoryEvents';
// export * from './DebugRuntimeStack'; // Removed
export { SoundBehavior, SOUND_MEMORY_TYPE } from './behaviors/SoundBehavior';

// IRuntimeBehavior is the canonical behavior interface
export type { IRuntimeBehavior } from './contracts/IRuntimeBehavior';

// @deprecated - IBehavior pattern exports (use IRuntimeBehavior instead)
export {
  BaseBehavior,
  composeBehaviors,
  createBehavior,
  isPushBehavior,
  isNextBehavior,
  isPopBehavior
} from './behaviors/IBehavior';
export type {
  IBehavior,
  IBehaviorContext,
  IPushBehavior,
  INextBehavior,
  IPopBehavior,
  BehaviorOperation
} from './behaviors/IBehavior';

export { PlaySoundAction } from './actions/PlaySoundAction';
export type {
  SoundBehaviorConfig,
  SoundCue,
  SoundState,
  SoundCueState
} from './models/SoundModels';
export { PREDEFINED_SOUNDS } from './models/SoundModels';
// Export other runtime components
