import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export class NoLoopBehavior implements IBehavior {
  private passCompleteRef?: IMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.passCompleteRef = runtime.memory.allocate<boolean>('single-pass-complete', block.key.toString(), false, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  isPassComplete(): boolean { return this.passCompleteRef?.get() ?? false; }
  markPassComplete(): void { this.passCompleteRef?.set(true); }
  resetPassState(): void { this.passCompleteRef?.set(false); }
}
