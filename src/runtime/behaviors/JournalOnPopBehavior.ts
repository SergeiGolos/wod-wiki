import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IJournalOnPopBehavior } from './IJournalOnPopBehavior';

export class JournalOnPopBehavior implements IJournalOnPopBehavior {
  private entriesRef?: IMemoryReference<any[]>;
  private enabledRef?: IMemoryReference<boolean>;

  constructor(private readonly enabledDefault: boolean = true) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.entriesRef = runtime.memory.allocate<any[]>('journal-entries', block.key.toString(), [], undefined, 'private');
    this.enabledRef = runtime.memory.allocate<boolean>('journal-enabled', block.key.toString(), this.enabledDefault, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] {
    if (!this.isJournalingEnabled()) return [];
    // In real impl, flush entries to durable store; here it's a no-op
    return [];
  }

  writeToJournal(): void {
    const list = this.entriesRef?.get() ?? [];
    list.push({ timestamp: Date.now(), message: 'pop' });
    this.entriesRef?.set(list);
  }
  getJournalEntries(): any[] { return this.entriesRef?.get() ?? []; }
  isJournalingEnabled(): boolean { return this.enabledRef?.get() ?? false; }
  setJournalingEnabled(enabled: boolean): void { this.enabledRef?.set(enabled); }
}
