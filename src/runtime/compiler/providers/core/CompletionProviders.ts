import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { CompletionBehavior } from '../../../behaviors/CompletionBehavior';
import { BoundTimerBehavior } from '../../../behaviors/BoundTimerBehavior';
import { TimerFragment } from '../../fragments/TimerFragment';

/**
 * Provides CompletionBehavior for timer-based completion.
 * Pops the block when the timer completes.
 */
export class TimerCompletionProvider implements IBehaviorProvider {
  readonly id = 'timer-completion';
  readonly name = 'Timer Completion Provider';
  readonly priority = BehaviorProviderPriority.COMPLETION;
  readonly group = 'completion';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('CompletionBehavior')) {
      return false;
    }

    // Only for timed blocks with bound timer
    const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
    const hasDuration = timerFragment !== undefined && 
                        typeof timerFragment.value === 'number' && 
                        timerFragment.value > 0;

    // Don't add completion if we have a loop that manages its own termination
    // (e.g., BoundLoopBehavior handles rounds-based completion)
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    
    // For pure timer blocks (no rounds) - timer determines completion
    // For AMRAP (timer + rounds) - timer determines completion
    return hasDuration && (!hasRounds || context.hasBehavior('UnboundLoopBehavior'));
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    // Find the bound timer behavior to create the condition
    const condition = (block: any, now: Date): boolean => {
      const timerBehavior = block.getBehavior(BoundTimerBehavior);
      if (timerBehavior) {
        return timerBehavior.isComplete(now);
      }
      return false;
    };

    return {
      behaviors: [
        new CompletionBehavior(condition, ['timer:tick', 'timer:complete']),
      ],
      requires: ['BoundTimerBehavior'],
    };
  }
}
