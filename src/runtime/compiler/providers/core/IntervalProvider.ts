import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { IntervalWaitingBehavior } from '../../../behaviors/IntervalWaitingBehavior';
import { IntervalTimerRestartBehavior } from '../../../behaviors/IntervalTimerRestartBehavior';

/**
 * Provides interval-specific behaviors for EMOM-style workouts.
 */
export class IntervalProvider implements IBehaviorProvider {
  readonly id = 'interval';
  readonly name = 'Interval Provider';
  readonly priority = BehaviorProviderPriority.INTERVAL;
  readonly group = 'interval';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('IntervalWaitingBehavior')) {
      return false;
    }

    // Check for EMOM pattern
    const hasTimer = statement.hasFragment(FragmentType.Timer);
    const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;
    const hasEmomAction = statement.fragments?.some(
      (f) =>
        f.fragmentType === FragmentType.Action &&
        typeof f.value === 'string' &&
        f.value.toLowerCase() === 'emom'
    );

    return hasTimer && (isInterval || hasEmomAction);
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [
        new IntervalWaitingBehavior(),
        new IntervalTimerRestartBehavior(),
      ],
      blockTypeHint: 'Interval',
      // Override loop providers to use RoundPerNext instead of RoundPerLoop for EMOM
      excludes: ['UnboundLoopBehavior', 'SinglePassBehavior'],
    };
  }
}
