import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IAllocateChildrenBehavior } from './IAllocateChildrenBehavior';

/**
 * Concrete AllocateChildrenBehavior. Parses child statements for a block and
 * groups them into lap groups. Minimal default grouping places each child in its
 * own group; customize parseChildrenGroups for more advanced rules.
 */
export class AllocateChildrenBehavior implements IAllocateChildrenBehavior {
  private childrenGroupsRef?: IMemoryReference<string[][]>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    const childSourceIds = this.getImmediateChildSourceIds(runtime, block);
    const groups = this.parseChildrenGroups(childSourceIds);
    this.childrenGroupsRef = runtime.memory.allocate<string[][]>(
      'children-groups',
      block.key.toString(),
      groups,
      undefined,
      'private'
    );
    return [{ level: 'debug', message: 'allocated children groups', timestamp: new Date(), context: { count: groups.length } }];
  }

  onPop(): IRuntimeLog[] { return []; }
  onNext(): IRuntimeLog[] { return []; }

  getChildrenGroups(): string[][] {
    return this.childrenGroupsRef?.get() ?? [];
  }

  getChildrenGroupsReference(): IMemoryReference<string[][]> | undefined {
    return this.childrenGroupsRef;
  }

  parseChildrenGroups(childSourceIds: string[]): string[][] {
    // Default behavior: each child in its own group. Can be enhanced to support laps (+) etc.
    return childSourceIds.map(id => [id]);
  }

  private getImmediateChildSourceIds(runtime: IScriptRuntime, block: IRuntimeBlock): string[] {
    const sourceIds: string[] = [];
    const statements: any[] = (runtime as any).script?.statements || [];
    // Find parent statement
    const parent = statements.find(s => s.id?.toString() === block.sourceId?.[0] || s.id?.toString() === (block as any).key?.toString());
    if (!parent) return sourceIds;
    const parentCol = parent.meta?.columnStart || 1;
    const idx = statements.indexOf(parent);
    for (let i = idx + 1; i < statements.length; i++) {
      const s = statements[i];
      const col = s.meta?.columnStart || 1;
      if (col <= parentCol) break;
      if (col === parentCol + 4 || col === parentCol + 2) sourceIds.push(s.id?.toString());
    }
    return sourceIds.filter(Boolean);
  }
}
