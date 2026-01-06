import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { ActionLayerBehavior } from '../../../behaviors/ActionLayerBehavior';

/**
 * Infrastructure provider - always contributes ActionLayerBehavior.
 * This is the foundation layer that every block needs.
 */
export class InfrastructureProvider implements IBehaviorProvider {
  readonly id = 'infrastructure';
  readonly name = 'Infrastructure Provider';
  readonly priority = BehaviorProviderPriority.INFRASTRUCTURE;
  readonly group = 'infrastructure';

  canProvide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): boolean {
    // Always provides infrastructure
    return true;
  }

  provide(
    _statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): IBehaviorContribution {
    return {
      behaviors: [
        new ActionLayerBehavior(
          context.blockId,
          context.fragmentGroups,
          context.sourceIds
        ),
      ],
    };
  }
}
