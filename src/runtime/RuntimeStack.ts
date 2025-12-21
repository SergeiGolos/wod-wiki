import { IRuntimeBlock } from './IRuntimeBlock';
import { StackObservable } from './StackObservable';
import { BlockKey } from '../core/models/BlockKey';

import { IRuntimeStack } from './IRuntimeStack';

/**
 * Lightweight runtime stack that only maintains state and notifies subscribers.
 * All complex logic (lifecycles, wrapping, hooks) has been moved to ScriptRuntime.
 */
export class RuntimeStack implements IRuntimeStack {
  private readonly _blocks: IRuntimeBlock[] = [];
  public readonly updates: StackObservable = new StackObservable();

  /** Top-first view of blocks (copy) */
  public get blocks(): readonly IRuntimeBlock[] {
    return [...this._blocks].reverse();
  }

  public get count(): number {
    return this._blocks.length;
  }

  public get current(): IRuntimeBlock | undefined {
    if (this._blocks.length === 0) {
      return undefined;
    }
    return this._blocks[this._blocks.length - 1];
  }

  public get keys(): BlockKey[] {
    return this.blocks.map(b => b.key);
  }

  public push(block: IRuntimeBlock): void {
    this._blocks.push(block);
    this.updates.notify({
      type: 'push',
      block,
      stackDepth: this._blocks.length,
      timestamp: Date.now()
    });
  }

  public pop(): IRuntimeBlock | undefined {
    const block = this._blocks.pop();
    if (block) {
      this.updates.notify({
        type: 'pop',
        block,
        stackDepth: this._blocks.length,
        timestamp: Date.now()
      });
    }
    return block;
  }

  public clear(): void {
    this._blocks.length = 0;
    this.updates.notify({
      type: 'clear',
      stackDepth: 0,
      timestamp: Date.now()
    });
  }
}
