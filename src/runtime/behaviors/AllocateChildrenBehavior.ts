import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';
import { FragmentType } from '../../CodeFragment';
import { ICodeStatement } from '@/CodeStatement';

/**
 * Concrete AllocateChildrenBehavior. Parses child statements for a block and
 * groups them into lap groups. Minimal default grouping places each child in its
 * own group; customize parseChildrenGroups for more advanced rules.
 */
export class AllocateChildrenBehavior implements IBehavior {
  private childrenGroupsRef?: IMemoryReference<string[][]> | undefined = undefined;

  constructor(private childIds: string[] = []) {
  }

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {    
    const children = runtime.script.getIds(this.childIds);    
    const groups: string[][] = [];    
    
    const getLapType = (stmt: ICodeStatement): 'compose' | 'round' | 'none' => {
      const lap = (stmt.fragments || []).find((f: any) => f.fragmentType === FragmentType.Lap);
      if (!lap) return 'none';
      const v = (lap.value as string) || '';
      if (v === 'compose') return 'compose';
      if (v === 'round') return 'round';
      return 'none';
    };

    let current: string[] = [];
    for (const child of children) {
      const idStr = String(child.id);
      const lapType = getLapType(child);       
      current.push(idStr);
      if (lapType === 'compose') {
        continue;
      }
      
      groups.push([idStr]);
      current = [];      
    }

    this.childrenGroupsRef = runtime.memory.allocate<string[][]>(
      'children',
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
    return []; 
  }
  
  onNext(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeLog[] { return []; }  
}
