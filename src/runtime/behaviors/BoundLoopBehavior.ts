import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IBoundLoopBehavior } from './IBoundLoopBehavior';

export class BoundLoopBehavior implements IBoundLoopBehavior {
  private remainingRef?: IMemoryReference<number>;
  private totalRef?: IMemoryReference<number>;

  constructor(private readonly totalIterations: number) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    this.totalRef = runtime.memory.allocate<number>('total-iterations', block.key.toString(), this.totalIterations, undefined, 'private');
    this.remainingRef = runtime.memory.allocate<number>('remaining-iterations', block.key.toString(), this.totalIterations, undefined, 'private');
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getRemainingIterations(): number { return this.remainingRef?.get() ?? 0; }
  setRemainingIterations(count: number): void { this.remainingRef?.set(count); }
  getTotalIterations(): number { return this.totalRef?.get() ?? this.totalIterations; }
  decrementIterations(): void { const r = this.getRemainingIterations(); if (r > 0) this.setRemainingIterations(r - 1); }
  hasMoreIterations(): boolean { return this.getRemainingIterations() > 0; }
  getRemainingIterationsReference(): IMemoryReference<number> | undefined { return this.remainingRef; }
}
