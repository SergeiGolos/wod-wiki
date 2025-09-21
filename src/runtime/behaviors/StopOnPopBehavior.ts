import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export class StopOnPopBehavior implements IBehavior {
  private timersRef?: IMemoryReference<string[]>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.timersRef = runtime.memory.allocate<string[]>('active-timers', block.key.toString(), [], undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] {
    // In a real timer system, cancel any active timers
    this.timersRef?.set([]);
    return [];
  }

  stopTimers(): void { this.timersRef?.set([]); }
  areTimersRunning(): boolean { return (this.timersRef?.get() ?? []).length > 0; }
  getActiveTimerIds(): string[] { return this.timersRef?.get() ?? []; }
}
