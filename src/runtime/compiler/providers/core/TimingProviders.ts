import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { BoundTimerBehavior } from '../../../behaviors/BoundTimerBehavior';
import { UnboundTimerBehavior } from '../../../behaviors/UnboundTimerBehavior';
import { LapTimerBehavior } from '../../../behaviors/LapTimerBehavior';
import { TimerFragment } from '../../fragments/TimerFragment';

/**
 * Provides BoundTimerBehavior for statements with Timer fragment and duration.
 */
export class BoundTimerProvider implements IBehaviorProvider {
  readonly id = 'bound-timer';
  readonly name = 'Bound Timer Provider';
  readonly priority = BehaviorProviderPriority.TIMING;
  readonly group = 'primary-timer';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('BoundTimerBehavior')) {
      return false;
    }

    const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
    // Must have a timer with a duration value
    return timerFragment !== undefined && 
           typeof timerFragment.value === 'number' && 
           timerFragment.value > 0;
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
    const durationMs = timerFragment?.value as number;
    const direction = timerFragment?.direction || 'down';
    const label = direction === 'down' ? 'Countdown' : 'For Time';

    return {
      behaviors: [new BoundTimerBehavior(durationMs, direction, label)],
      excludes: ['UnboundTimerBehavior'],
      blockTypeHint: 'Timer',
    };
  }
}

/**
 * Provides UnboundTimerBehavior for statements without a bound timer.
 * Lower priority than BoundTimerProvider so it only fires as fallback.
 */
export class UnboundTimerProvider implements IBehaviorProvider {
  readonly id = 'unbound-timer';
  readonly name = 'Unbound Timer Provider';
  readonly priority = BehaviorProviderPriority.TIMING - 10; // Slightly lower
  readonly group = 'primary-timer';

  canProvide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    // Only provide if no primary timer exists yet and not excluded
    return !context.hasBehavior('BoundTimerBehavior') && 
           !context.isExcluded('UnboundTimerBehavior');
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new UnboundTimerBehavior('Segment Timer', 'secondary')],
      excludes: ['BoundTimerBehavior'],
    };
  }
}

/**
 * Provides LapTimerBehavior for blocks with rounds/loops.
 */
export class LapTimerProvider implements IBehaviorProvider {
  readonly id = 'lap-timer';
  readonly name = 'Lap Timer Provider';
  readonly priority = BehaviorProviderPriority.TIMING - 20;
  // No group - can coexist with primary timer

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('LapTimerBehavior')) {
      return false;
    }

    // Provide for blocks that have rounds or have children (loops)
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    const hasChildren = (statement.children && statement.children.length > 0) || false;
    
    return hasRounds || hasChildren;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new LapTimerBehavior()],
    };
  }
}
