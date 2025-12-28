import { MdTimerRuntime } from '../../parser/md-timer';
import { JitCompiler } from '../../runtime/compiler/JitCompiler';
import { TimeBoundRoundsStrategy } from '../../runtime/compiler/strategies/TimeBoundRoundsStrategy';
import { IntervalStrategy } from '../../runtime/compiler/strategies/IntervalStrategy';
import { TimerStrategy } from '../../runtime/compiler/strategies/TimerStrategy';
import { RoundsStrategy } from '../../runtime/compiler/strategies/RoundsStrategy';
import { GroupStrategy } from '../../runtime/compiler/strategies/GroupStrategy';
import { EffortStrategy } from '../../runtime/compiler/strategies/EffortStrategy';

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
export const globalParser = new MdTimerRuntime();

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
  
  // Register strategies in order of specificity (most specific first)
  compiler.registerStrategy(new TimeBoundRoundsStrategy());
  compiler.registerStrategy(new IntervalStrategy());
  compiler.registerStrategy(new TimerStrategy());
  compiler.registerStrategy(new RoundsStrategy());
  compiler.registerStrategy(new GroupStrategy());
  compiler.registerStrategy(new EffortStrategy());
  
  return compiler;
})();
