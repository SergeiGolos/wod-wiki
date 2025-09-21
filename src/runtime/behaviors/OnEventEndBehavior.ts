import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export class OnEventEndBehavior implements IBehavior {
  private endRef?: IMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.endRef = runtime.memory.allocate<boolean>('end-event', block.key.toString(), false, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  isEndEventReceived(): boolean { return this.endRef?.get() ?? false; }
  markEndEventReceived(): void { this.endRef?.set(true); }
  resetEndEventState(): void { this.endRef?.set(false); }
  handleEndEvent(): void { this.markEndEventReceived(); }
}
