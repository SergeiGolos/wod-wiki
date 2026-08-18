// JIT Compiler — public surface for this barrel.
// Consumers that need individual strategies import directly from
// @/runtime/compiler/strategies/<StrategyName> to avoid dead-symbol bloat.
export { JitCompiler } from './JitCompiler';
export { RuntimeFactory } from './RuntimeFactory';
export type { IRuntimeFactory } from './RuntimeFactory';
export { RuntimeBuilder } from './RuntimeBuilder';
