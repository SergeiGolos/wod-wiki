import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { RepSchemeBehavior } from '../../../behaviors/RepSchemeBehavior';
import { RoundsFragment } from '../../fragments/RoundsFragment';
import { RepFragment } from '../../fragments/RepFragment';

/**
 * Provides RepSchemeBehavior for blocks with variable rep schemes.
 */
export class RepSchemeProvider implements IBehaviorProvider {
  readonly id = 'rep-scheme';
  readonly name = 'Rep Scheme Provider';
  readonly priority = BehaviorProviderPriority.REP_SCHEME;

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('RepSchemeBehavior')) {
      return false;
    }

    // Check if there's a rep scheme (array of reps)
    const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);
    if (Array.isArray(roundsFragment?.value)) {
      return true;
    }

    // Or multiple rep fragments
    const repFragments = statement.filterFragments?.<RepFragment>(FragmentType.Rep) || [];
    return repFragments.length > 1;
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);
    const repFragments = statement.filterFragments?.<RepFragment>(FragmentType.Rep) || [];

    let repScheme: number[];

    if (Array.isArray(roundsFragment?.value)) {
      repScheme = roundsFragment.value as number[];
    } else {
      repScheme = repFragments.map((f) => f.value as number);
    }

    return {
      behaviors: [new RepSchemeBehavior(repScheme)],
    };
  }
}
