// JIT Compiler — public surface for this barrel.
// Consumers that need individual strategies import directly from
// @/runtime/compiler/strategies/<StrategyName> to avoid dead-symbol bloat.
export { JitCompiler } from './JitCompiler';
export { RuntimeFactory } from './RuntimeFactory';
export type { IRuntimeFactory } from './RuntimeFactory';
export { RuntimeBuilder } from './RuntimeBuilder';
export {
  findUnresolvedChoices,
  isChoiceResolved,
  writeChoiceSelection,
  collapseUnresolvedChoices,
} from './metrics/ChoiceResolution';
// Public compiler building blocks (#970 cutover parity): app-side test
// harnesses construct builders and metric classes directly.
export { BlockBuilder } from './BlockBuilder';
export { ChoiceGroupMetric } from './metrics/ChoiceGroupMetric';

// Compiler strategies are public API — app-side test harnesses and debug
// tooling instantiate them directly (cutover parity #970).
export { SessionRootStrategy } from './strategies/SessionRootStrategy';
export { AmrapLogicStrategy } from './strategies/logic/AmrapLogicStrategy';
export { IntervalLogicStrategy } from './strategies/logic/IntervalLogicStrategy';
export { EffortFallbackStrategy } from './strategies/fallback/EffortFallbackStrategy';
export { GenericGroupStrategy } from './strategies/components/GenericGroupStrategy';
export { GenericLoopStrategy } from './strategies/components/GenericLoopStrategy';
export { GenericTimerStrategy } from './strategies/components/GenericTimerStrategy';
export { ChildrenStrategy } from './strategies/enhancements/ChildrenStrategy';
export { ReportOutputStrategy } from './strategies/enhancements/ReportOutputStrategy';
export { SoundStrategy } from './strategies/enhancements/SoundStrategy';
export { RoundsMetric } from './metrics/RoundsMetric';
