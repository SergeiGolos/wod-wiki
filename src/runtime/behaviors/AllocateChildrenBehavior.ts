import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';
import { FragmentType } from '../../CodeFragment';

/**
 * Concrete AllocateChildrenBehavior. Parses child statements for a block and
 * groups them into lap groups. Minimal default grouping places each child in its
 * own group; customize parseChildrenGroups for more advanced rules.
 */
export class AllocateChildrenBehavior implements IBehavior {
  private childrenGroupsRef?: IMemoryReference<string[][]> | undefined = undefined;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    const codeBlocks = runtime.script.getIds(block.sourceId);
    const children = runtime.script.getIds(codeBlocks?.flatMap(cb => cb.children || []) || []);
    
    // Grouping rules:
    // - If a child has lap '-' (round) OR no lap fragment -> it is its own group
    // - Any consecutive '+' (compose) laps are grouped together
    const groups: string[][] = [];
    let currentComposeGroup: string[] | null = null;

    const getLapType = (stmt: any): 'compose' | 'round' | 'none' => {
      const lap = (stmt.fragments || []).find((f: any) => f.fragmentType === FragmentType.Lap);
      if (!lap) return 'none';
      const v = (lap.value as string) || '';
      if (v === 'compose') return 'compose';
      if (v === 'round') return 'round';
      return 'none';
    };

    for (const child of children) {
      const idStr = String(child.id);
      const lapType = getLapType(child);

      if (lapType === 'compose') {
        // Start or extend a compose run
        if (!currentComposeGroup) currentComposeGroup = [];
        currentComposeGroup.push(idStr);
      } else {
        // Close any pending compose group
        if (currentComposeGroup && currentComposeGroup.length > 0) {
          groups.push(currentComposeGroup);
          currentComposeGroup = null;
        }
        // '-' (round) or 'none' always form their own group
        groups.push([idStr]);
      }
    }

    // Flush trailing compose group if present
    if (currentComposeGroup && currentComposeGroup.length > 0) {
      groups.push(currentComposeGroup);
    }

    this.childrenGroupsRef = runtime.memory.allocate<string[][]>(
      'children-groups',
      block.key.toString(),
      groups,
      undefined,
      'private'
    );
    return [{ level: 'debug', message: 'allocated children groups', timestamp: new Date(), context: { count: groups.length } }];
  }

  onPop(runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeLog[] { 
    runtime.memory.release(this.childrenGroupsRef!);
    this.childrenGroupsRef = undefined;
    return []; }
  onNext(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeLog[] { return []; }

  // Accessors for other components/blocks to read the groups
  getChildrenGroups(): string[][] { return this.childrenGroupsRef?.get() ?? []; }
  getChildrenGroupsReference(): IMemoryReference<string[][]> | undefined { return this.childrenGroupsRef; }
}
