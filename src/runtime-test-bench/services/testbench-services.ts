import { sharedParser } from '../../parser/parserInstance';
import { JitCompiler } from '../../runtime/compiler/JitCompiler';
// Composable Strategies

// New Composable Strategies
import { AmrapLogicStrategy } from '../../runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../../runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../../runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../../runtime/compiler/strategies/components/GenericLoopStrategy';
import { SoundStrategy } from '../../runtime/compiler/strategies/enhancements/SoundStrategy';
import { HistoryStrategy } from '../../runtime/compiler/strategies/enhancements/HistoryStrategy';
import { ChildrenStrategy } from '../../runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { GenericGroupStrategy } from '../../runtime/compiler/strategies/components/GenericGroupStrategy';
import { EffortFallbackStrategy } from '../../runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Module-Level Services for RuntimeTestBench
 * This singleton is created once when the module loads and shared
 * across all RuntimeTestBench instances.
 * 
 * @example
 * ```typescript
 * import { globalParser } from './services/testbench-services';
 * 
 * const script = globalParser.read(codeString);
 * ```
 */
export const globalParser = sharedParser;

/**
 * Global compiler instance with all strategies registered.
 * 
 * Strategies are registered in order of specificity (most specific first):
 * 1. TimeBoundRoundsStrategy - Timer + Rounds/AMRAP (most specific)
 * 2. IntervalStrategy - Timer + EMOM
 * 3. TimerStrategy - Timer only
 * 4. RoundsStrategy - Rounds only
 * 5. GroupStrategy - Has children
 * 6. EffortStrategy - Fallback (everything else)
 * 
 * This singleton is created once when the module loads and shared
 * across all RuntimeTestBench instances.
 * 
 * @example
 * ```typescript
 * import { globalCompiler } from './services/testbench-services';
 * 
 * const blocks = globalCompiler.compile(script);
 * ```
 */
export const globalCompiler = (() => {
  const compiler = new JitCompiler();

  // Register new Composable Strategies
  // Logic
  compiler.registerStrategy(new AmrapLogicStrategy());
  compiler.registerStrategy(new IntervalLogicStrategy());

  // Components
  compiler.registerStrategy(new GenericTimerStrategy());
  compiler.registerStrategy(new GenericLoopStrategy());
  compiler.registerStrategy(new GenericGroupStrategy());

  // Enhancements
  compiler.registerStrategy(new SoundStrategy());
  compiler.registerStrategy(new HistoryStrategy());
  compiler.registerStrategy(new ChildrenStrategy());

  // Fallback
  compiler.registerStrategy(new EffortFallbackStrategy());

  return compiler;
})();
