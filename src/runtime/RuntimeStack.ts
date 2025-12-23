import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';

import { IRuntimeStack } from './IRuntimeStack';

/**
 * Lightweight runtime stack that only maintains state.
 * All complex logic (lifecycles, wrapping, hooks) has been moved to ScriptRuntime.
 * Stack events are dispatched via the EventBus in ScriptRuntime.
 */
export class RuntimeStack implements IRuntimeStack {
  private readonly _blocks: IRuntimeBlock[] = [];

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
  }

  public pop(): IRuntimeBlock | undefined {
    return this._blocks.pop();
  }

  public clear(): void {
    this._blocks.length = 0;
  }
}
