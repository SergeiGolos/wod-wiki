import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { ChildRunnerBehavior } from '../../../behaviors/ChildRunnerBehavior';

/**
 * Provides ChildRunnerBehavior for statements with children.
 * Handles pushing child blocks onto the stack.
 */
export class ChildExecutionProvider implements IBehaviorProvider {
  readonly id = 'child-execution';
  readonly name = 'Child Execution Provider';
  readonly priority = BehaviorProviderPriority.CHILD_EXECUTION;
  readonly group = 'child-execution';

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('ChildRunnerBehavior')) {
      return false;
    }
    return (statement.children && statement.children.length > 0) || false;
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    // Convert children to their statement IDs
    const children = statement.children || [];
    const childGroups: number[][] = children.map((child) => {
      if (typeof child === 'number') {
        return [child];
      }
      // If child is a statement object, get its ID
      const childStmt = child as unknown as ICodeStatement;
      return childStmt.id !== undefined ? [childStmt.id as number] : [];
    }).filter(group => group.length > 0);

    return {
      behaviors: [new ChildRunnerBehavior(childGroups)],
      requires: ['ChildIndexBehavior'],
    };
  }
}
