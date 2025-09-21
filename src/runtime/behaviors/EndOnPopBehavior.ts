import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export class EndOnPopBehavior implements IBehavior {
  private endOnPopRef?: IMemoryReference<boolean>;

  constructor(private readonly defaultState: boolean = true) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.endOnPopRef = runtime.memory.allocate<boolean>('end-on-pop', block.key.toString(), this.defaultState, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  shouldEndOnPop(): boolean { return this.endOnPopRef?.get() ?? false; }
  markForEndOnPop(): void { this.endOnPopRef?.set(true); }
  triggerProgramEnd(): void { this.endOnPopRef?.set(true); }
  resetEndOnPopState(): void { this.endOnPopRef?.set(false); }
}
