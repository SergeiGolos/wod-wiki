import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { HistoryBehavior } from '../../../behaviors/HistoryBehavior';
import { RoundDisplayBehavior } from '../../../behaviors/RoundDisplayBehavior';
import { RoundSpanBehavior } from '../../../behaviors/RoundSpanBehavior';
import { RoundsFragment } from '../../fragments/RoundsFragment';
import { RepFragment } from '../../fragments/RepFragment';
import { createSpanMetadata } from '../../../utils/metadata';

/**
 * Provides HistoryBehavior for span tracking.
 * Almost always contributed for proper history/analytics.
 */
export class HistoryProvider implements IBehaviorProvider {
  readonly id = 'history';
  readonly name = 'History Provider';
  readonly priority = BehaviorProviderPriority.TRACKING;
  // No group - always contributes

  canProvide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    return !context.isExcluded('HistoryBehavior');
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): IBehaviorContribution {
    const hints = context.blockTypeHints;
    const blockType = hints.length > 0 ? hints[0] : 'Block';
    const tags = this.determineTags(statement, blockType);

    return {
      behaviors: [
        new HistoryBehavior({
          label: blockType,
          debugMetadata: createSpanMetadata(tags, {
            strategyUsed: 'ComposableBlockCompiler',
            providers: 'composable',
          }),
        }),
      ],
    };
  }

  private determineTags(statement: ICodeStatement, blockType: string): string[] {
    const tags: string[] = [blockType.toLowerCase()];

    if (statement.hasFragment(FragmentType.Timer)) {
      const timer = statement.findFragment(FragmentType.Timer);
      const direction = (timer as any)?.direction || 'up';
      tags.push(direction === 'down' ? 'countdown' : 'count_up');
    }

    if (statement.hasFragment(FragmentType.Rounds)) {
      tags.push('rounds');
    }

    if (statement.children && statement.children.length === 0) {
      tags.push('leaf_node');
    }

    return tags;
  }
}

/**
 * Provides RoundDisplayBehavior for blocks with fixed round counts.
 */
export class RoundDisplayProvider implements IBehaviorProvider {
  readonly id = 'round-display';
  readonly name = 'Round Display Provider';
  readonly priority = BehaviorProviderPriority.TRACKING - 5;

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('RoundDisplayBehavior')) {
      return false;
    }
    // Only for blocks with explicit rounds (not AMRAP which is unbounded)
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    const hasTimer = statement.hasFragment(FragmentType.Timer);
    
    // Pure rounds or interval (not AMRAP)
    return hasRounds && !hasTimer;
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);
    let totalRounds = 1;

    if (Array.isArray(roundsFragment?.value)) {
      totalRounds = (roundsFragment.value as number[]).length;
    } else if (typeof roundsFragment?.value === 'number') {
      totalRounds = roundsFragment.value;
    }

    return {
      behaviors: [new RoundDisplayBehavior(totalRounds)],
    };
  }
}

/**
 * Provides RoundSpanBehavior for blocks with rounds.
 */
export class RoundSpanProvider implements IBehaviorProvider {
  readonly id = 'round-span';
  readonly name = 'Round Span Provider';
  readonly priority = BehaviorProviderPriority.TRACKING - 10;

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('RoundSpanBehavior')) {
      return false;
    }
    return statement.hasFragment(FragmentType.Rounds) ||
           (statement.children && statement.children.length > 0);
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): IBehaviorContribution {
    const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);
    const repFragments = statement.filterFragments?.<RepFragment>(FragmentType.Rep) || [];

    let repScheme: number[] | undefined;
    let totalRounds: number | undefined;

    if (Array.isArray(roundsFragment?.value)) {
      repScheme = roundsFragment.value as number[];
      totalRounds = repScheme.length;
    } else if (typeof roundsFragment?.value === 'number') {
      totalRounds = roundsFragment.value;
      if (repFragments.length > 0) {
        repScheme = repFragments.map((f) => f.value as number);
      }
    }

    // Determine span type based on context hints
    const hints = context.blockTypeHints;
    let spanType: 'rounds' | 'interval' = 'rounds';
    if (hints.includes('Interval')) {
      spanType = 'interval';
    }

    return {
      behaviors: [new RoundSpanBehavior(spanType, repScheme, totalRounds)],
    };
  }
}
