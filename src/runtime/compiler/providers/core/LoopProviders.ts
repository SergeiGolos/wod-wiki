import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { ChildIndexBehavior } from '../../../behaviors/ChildIndexBehavior';
import { RoundPerLoopBehavior } from '../../../behaviors/RoundPerLoopBehavior';
import { RoundPerNextBehavior } from '../../../behaviors/RoundPerNextBehavior';
import { SinglePassBehavior } from '../../../behaviors/SinglePassBehavior';
import { BoundLoopBehavior } from '../../../behaviors/BoundLoopBehavior';
import { UnboundLoopBehavior } from '../../../behaviors/UnboundLoopBehavior';
import { RoundsFragment } from '../../fragments/RoundsFragment';

/**
 * Provides ChildIndexBehavior for statements with children.
 */
export class ChildIndexProvider implements IBehaviorProvider {
  readonly id = 'child-index';
  readonly name = 'Child Index Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL;
  readonly group = 'child-management';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('ChildIndexBehavior')) {
      return false;
    }
    return (statement.children && statement.children.length > 0) || false;
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    const childCount = statement.children?.length || 0;
    return {
      behaviors: [new ChildIndexBehavior(childCount)],
    };
  }
}

/**
 * Provides RoundPerLoopBehavior for blocks with children.
 * Increments round when child index wraps.
 */
export class RoundPerLoopProvider implements IBehaviorProvider {
  readonly id = 'round-per-loop';
  readonly name = 'Round Per Loop Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL - 10;
  readonly group = 'round-counting';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('RoundPerLoopBehavior')) {
      return false;
    }
    // Requires children (for loop-based round counting)
    return (statement.children && statement.children.length > 0) || false;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new RoundPerLoopBehavior()],
      excludes: ['RoundPerNextBehavior'],
      requires: ['ChildIndexBehavior'],
    };
  }
}

/**
 * Provides RoundPerNextBehavior for leaf blocks (no children).
 * Increments round on each next() call.
 */
export class RoundPerNextProvider implements IBehaviorProvider {
  readonly id = 'round-per-next';
  readonly name = 'Round Per Next Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL - 15;
  readonly group = 'round-counting';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('RoundPerNextBehavior')) {
      return false;
    }
    // Only for leaf blocks (no children) or when explicitly needed
    const hasChildren = (statement.children && statement.children.length > 0) || false;
    return !hasChildren;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new RoundPerNextBehavior()],
      excludes: ['RoundPerLoopBehavior'],
    };
  }
}

/**
 * Provides SinglePassBehavior - pops after one pass through children.
 */
export class SinglePassProvider implements IBehaviorProvider {
  readonly id = 'single-pass';
  readonly name = 'Single Pass Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL - 20;
  readonly group = 'loop-termination';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('SinglePassBehavior')) {
      return false;
    }
    // Single pass when no rounds specified and has children
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    const hasTimer = statement.hasFragment(FragmentType.Timer);
    
    // Use single pass for groups without explicit rounds
    return !hasRounds && !hasTimer;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new SinglePassBehavior()],
      excludes: ['BoundLoopBehavior', 'UnboundLoopBehavior'],
      blockTypeHint: 'Group',
    };
  }
}

/**
 * Provides BoundLoopBehavior - runs for a fixed number of rounds.
 */
export class BoundLoopProvider implements IBehaviorProvider {
  readonly id = 'bound-loop';
  readonly name = 'Bound Loop Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL - 20;
  readonly group = 'loop-termination';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('BoundLoopBehavior')) {
      return false;
    }
    // Bound loop when rounds specified without timer-based completion
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    const hasTimer = statement.hasFragment(FragmentType.Timer);
    
    // Pure rounds-based (no timer) OR interval (timer + rounds for EMOM)
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
      behaviors: [new BoundLoopBehavior(totalRounds)],
      excludes: ['SinglePassBehavior', 'UnboundLoopBehavior'],
      blockTypeHint: 'Rounds',
    };
  }
}

/**
 * Provides UnboundLoopBehavior - runs until externally terminated (AMRAP).
 */
export class UnboundLoopProvider implements IBehaviorProvider {
  readonly id = 'unbound-loop';
  readonly name = 'Unbound Loop Provider';
  readonly priority = BehaviorProviderPriority.LOOP_CONTROL - 20;
  readonly group = 'loop-termination';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('UnboundLoopBehavior')) {
      return false;
    }
    // AMRAP pattern: timer + rounds (time-bound with variable rounds)
    const hasTimer = statement.hasFragment(FragmentType.Timer);
    const hasRounds = statement.hasFragment(FragmentType.Rounds);
    
    return hasTimer && hasRounds;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [new UnboundLoopBehavior()],
      excludes: ['SinglePassBehavior', 'BoundLoopBehavior'],
      blockTypeHint: 'AMRAP',
    };
  }
}
