import type { IMemoryReference, TypedMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export type LoopIndexState = { remainingRounds: number; currentChildIndex: number; childStatements: any[]; };


export class AllocateIndexBehavior implements IBehavior {

  constructor(
    private loopRef: TypedMemoryReference<LoopIndexState>,
    private childRef: TypedMemoryReference<number[][]>
  ) { }

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.loopRef.set({ remainingRounds: 0, currentChildIndex: -1, childStatements: [] });
    return [{ level: 'debug', message: 'allocated loop/child indices', timestamp: new Date() }];
  }
  onNext(): IRuntimeLog[] {
    let current = this.loopRef.get();
    let children = this.childRef.get() || [];
    if (!current) {
      return [{ level: 'error', message: 'loop index state not initialized', timestamp: new Date() }];
    }

    current.currentChildIndex += 1;
    if (children.length >= current.childStatements.length) {
      current.remainingRounds += 1;
      current.currentChildIndex = 0;
    }

    return [];
  }
  onPop(): IRuntimeLog[] { return []; }
}
