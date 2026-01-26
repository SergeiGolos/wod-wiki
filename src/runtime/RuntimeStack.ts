import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';

import { IRuntimeStack, StackListener } from './contracts/IRuntimeStack';

/**
 * Lightweight runtime stack that only maintains state.
 * All complex logic (lifecycles, wrapping, hooks) has been moved to ScriptRuntime.
 * Stack events are dispatched via the EventBus in ScriptRuntime and via
 * independent subscribers on this stack.
 */
export class RuntimeStack implements IRuntimeStack {
  private readonly _blocks: IRuntimeBlock[] = [];
  private readonly _listeners: Set<StackListener> = new Set();

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
    this.notify({ type: 'push', block, depth: this._blocks.length });
  }

  public pop(): IRuntimeBlock | undefined {
    const block = this._blocks.pop();
    if (block) {
      this.notify({ type: 'pop', block, depth: this._blocks.length + 1 });
    }
    return block;
  }

  public clear(): void {
    while (this._blocks.length > 0) {
      this.pop();
    }
  }

  /**
   * Subscribe to stack changes.
   * New subscribers will immediately receive an 'initial' event with the current stack state.
   */
  public subscribe(listener: StackListener): () => void {
    this._listeners.add(listener);

    // Immediate notification of current state
    listener({ type: 'initial', blocks: this.blocks });

    return () => {
      this._listeners.delete(listener);
    };
  }

  private notify(event: any): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in stack listener:', error);
      }
    }
  }
}
