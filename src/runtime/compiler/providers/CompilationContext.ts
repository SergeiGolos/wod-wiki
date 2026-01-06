import { ICodeStatement } from '@/core/models/CodeStatement';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '@/core/models/BlockKey';
import { ICompilationContext } from './IBehaviorProvider';

/**
 * Implementation of compilation context for behavior provider coordination.
 */
export class CompilationContext implements ICompilationContext {
  private readonly _currentBehaviors: IRuntimeBehavior[] = [];
  private readonly _excludedTypes: Set<string> = new Set();
  private readonly _blockTypeHints: string[] = [];

  constructor(
    public readonly blockKey: BlockKey,
    public readonly blockId: string,
    public readonly exerciseId: string,
    public readonly blockContext: BlockContext,
    public readonly fragmentGroups: ICodeFragment[][],
    public readonly statement: ICodeStatement,
    public readonly sourceIds: number[]
  ) {}

  get currentBehaviors(): IRuntimeBehavior[] {
    return [...this._currentBehaviors];
  }

  get excludedTypes(): Set<string> {
    return new Set(this._excludedTypes);
  }

  get blockTypeHints(): string[] {
    return [...this._blockTypeHints];
  }

  hasBehavior(typeName: string): boolean {
    return this._currentBehaviors.some(
      (b) => b.constructor.name === typeName
    );
  }

  isExcluded(typeName: string): boolean {
    return this._excludedTypes.has(typeName);
  }

  addBehavior(behavior: IRuntimeBehavior): void {
    this._currentBehaviors.push(behavior);
  }

  addExclusion(typeName: string): void {
    this._excludedTypes.add(typeName);
  }

  addBlockTypeHint(hint: string): void {
    this._blockTypeHints.push(hint);
  }
}
