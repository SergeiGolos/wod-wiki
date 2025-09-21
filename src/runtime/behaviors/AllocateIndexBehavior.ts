import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';


export class AllocateIndexBehavior implements IBehavior {
  private loopIndexRef?: IMemoryReference<number>;
  private childIndexRef?: IMemoryReference<number>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.loopIndexRef = runtime.memory.allocate<number>('loop-index', block.key.toString(), 0, undefined, 'private');
    this.childIndexRef = runtime.memory.allocate<number>('child-index', block.key.toString(), -1, undefined, 'private');
    return [{ level: 'debug', message: 'allocated loop/child indices', timestamp: new Date() }];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getLoopIndex(): number { return this.loopIndexRef?.get() ?? 0; }
  setLoopIndex(index: number): void { this.loopIndexRef?.set(index); }
  getChildIndex(): number { return this.childIndexRef?.get() ?? -1; }
  setChildIndex(index: number): void { this.childIndexRef?.set(index); }
  getLoopIndexReference(): IMemoryReference<number> | undefined { return this.loopIndexRef; }
  getChildIndexReference(): IMemoryReference<number> | undefined { return this.childIndexRef; }
}
