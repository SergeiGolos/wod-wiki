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
