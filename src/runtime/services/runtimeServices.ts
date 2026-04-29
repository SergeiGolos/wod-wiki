import { sharedParser } from '../../parser/parserInstance';
import { JitCompiler } from '../compiler/JitCompiler';
// Composable Strategies

// New Composable Strategies
import { AmrapLogicStrategy } from '../compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../compiler/strategies/components/GenericLoopStrategy';
import { SoundStrategy } from '../compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '../compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '../compiler/strategies/enhancements/ChildrenStrategy';
import { GenericGroupStrategy } from '../compiler/strategies/components/GenericGroupStrategy';
import { EffortFallbackStrategy } from '../compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Shared parser singleton.
 * 
 * @example
 * ```typescript
 * import { globalParser } from '@/runtime/services/runtimeServices';
 * 
 * const script = globalParser.read(codeString);
 * ```
 */
export const globalParser = sharedParser;

/**
 * Global compiler instance with all strategies registered.
 * 
 * Strategies are registered in order of specificity (most specific first):
 * 1. AmrapLogicStrategy - Timer + Rounds/AMRAP (most specific)
 * 2. IntervalLogicStrategy - Timer + EMOM
 * 3. GenericTimerStrategy - Timer only
 * 4. GenericLoopStrategy - Rounds only
 * 5. GenericGroupStrategy - Has children
 * 6. EffortFallbackStrategy - Fallback (everything else)
 * 
 * This singleton is created once when the module loads and shared
 * across all runtime instances.
 * 
 * @example
 * ```typescript
 * import { globalCompiler } from '@/runtime/services/runtimeServices';
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
  compiler.registerStrategy(new ReportOutputStrategy());
  compiler.registerStrategy(new ChildrenStrategy());

  // Fallback
  compiler.registerStrategy(new EffortFallbackStrategy());

  return compiler;
})();
