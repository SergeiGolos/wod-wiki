import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBehavior } from '../IBehavior';

export class DurationEventBehavior implements IBehavior {
  private durationRef?: IMemoryReference<number>;
  private startTimeRef?: IMemoryReference<Date>;
  private elapsedRef?: IMemoryReference<number>;

  constructor(private readonly initialDurationMs: number = 0) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.durationRef = runtime.memory.allocate<number>('duration', block.key.toString(), this.initialDurationMs, undefined, 'private');
    this.elapsedRef = runtime.memory.allocate<number>('elapsed-time', block.key.toString(), 0, undefined, 'private');
    this.startTimeRef = runtime.memory.allocate<Date>('start-time', block.key.toString(), new Date(), undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getDuration(): number { return this.durationRef?.get() ?? 0; }
  setDuration(duration: number): void { this.durationRef?.set(duration); }
  getStartTime(): Date | undefined { return this.startTimeRef?.get(); }
  setStartTime(startTime: Date): void { this.startTimeRef?.set(startTime); }
  getElapsedTime(): number { return this.elapsedRef?.get() ?? 0; }
  hasDurationElapsed(): boolean {
    const dur = this.getDuration();
    const start = this.getStartTime();
    if (!start || dur <= 0) return false;
    return (Date.now() - start.getTime()) >= dur;
  }
  startDuration(): void { if (this.startTimeRef) this.startTimeRef.set(new Date()); }
  stopDuration(): void {
    // noop for now; could capture end time
  }
  tickDuration(currentTime?: Date): boolean {
    const start = this.getStartTime();
    if (!start) return false;
    const now = currentTime ?? new Date();
    const elapsed = now.getTime() - start.getTime();
    this.elapsedRef?.set(elapsed);
    return elapsed >= this.getDuration();
  }
  getDurationReference(): IMemoryReference<number> | undefined { return this.durationRef; }
}
