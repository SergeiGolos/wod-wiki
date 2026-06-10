import { JitCompiler } from '../compiler/JitCompiler';

// Strategies (ordered by specificity)
import { AmrapLogicStrategy } from '../compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '../compiler/strategies/components/GenericGroupStrategy';
import { RestBlockStrategy } from '../compiler/strategies/components/RestBlockStrategy';
import { SoundStrategy } from '../compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '../compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '../compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '../compiler/strategies/fallback/EffortFallbackStrategy';

import type { IRuntimeBlockStrategy } from '../contracts/IRuntimeBlockStrategy';

/**
 * The canonical strategy set — the single source of truth for which strategies
 * are registered, in what order. Production and test both use this list.
 */
export const PRODUCTION_STRATEGIES: IRuntimeBlockStrategy[] = [
  // Logic (priority 90)
  new AmrapLogicStrategy(),
  new IntervalLogicStrategy(),

  // Components (priority 50)
  new GenericTimerStrategy(),
  new GenericLoopStrategy(),
  new GenericGroupStrategy(),
  new RestBlockStrategy(),

  // Enhancements (priority 15–50)
  new SoundStrategy(),
  new ReportOutputStrategy(),
  new ChildrenStrategy(),

  // Fallback (priority 0)
  new EffortFallbackStrategy(),
];

/**
 * Create a JitCompiler with the given strategies (or the production set).
 */
export function createCompiler(strategies?: IRuntimeBlockStrategy[]): JitCompiler {
  const compiler = new JitCompiler();
  for (const strategy of (strategies ?? PRODUCTION_STRATEGIES)) {
    compiler.registerStrategy(strategy);
  }
  return compiler;
}