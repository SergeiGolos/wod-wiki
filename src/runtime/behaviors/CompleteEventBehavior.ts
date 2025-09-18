import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { ICompleteEventBehavior } from './ICompleteEventBehavior';

export class CompleteEventBehavior implements ICompleteEventBehavior {
  private completeRef?: IMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.completeRef = runtime.memory.allocate<boolean>('complete-event', block.key.toString(), false, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  isCompleteEventReceived(): boolean { return this.completeRef?.get() ?? false; }
  markCompleteEventReceived(): void { this.completeRef?.set(true); }
  resetCompleteEventState(): void { this.completeRef?.set(false); }
  handleCompleteEvent(): void { this.markCompleteEventReceived(); }
}
