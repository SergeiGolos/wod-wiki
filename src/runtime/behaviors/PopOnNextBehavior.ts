import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IPopOnNextBehavior } from './IPopOnNextBehavior';

export class PopOnNextBehavior implements IPopOnNextBehavior {
  private popRef?: IMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.popRef = runtime.memory.allocate<boolean>('pop-on-next', block.key.toString(), false, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  shouldPopOnNext(): boolean { return this.popRef?.get() ?? false; }
  markForPopOnNext(): void { this.popRef?.set(true); }
  resetPopOnNextState(): void { this.popRef?.set(false); }
}
