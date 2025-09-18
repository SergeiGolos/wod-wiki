import { BlockKey } from "../../BlockKey";
import { IRuntimeEvent, IRuntimeLog } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IRuntimeMemory } from "../memory/IRuntimeMemory";

/**
 * Adapter to allow legacy memory-based blocks to coexist with the new IRuntimeBlock union contract.
 * It forwards push/next/pop to the legacy block using the runtime's memory when available.
 */
export class MemoryBlockAdapter implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceId: string[];

  constructor(private legacy: {
    key: BlockKey;
    sourceId: string[];
    push(memory: IRuntimeMemory): IRuntimeEvent[];
    next(memory: IRuntimeMemory): IRuntimeBlock | undefined;
    pop(memory: IRuntimeMemory): void;
  }) {
    this.key = legacy.key;
    this.sourceId = legacy.sourceId;
  }

  push(runtimeOrMemory: IScriptRuntime | IRuntimeMemory): IRuntimeEvent[] | IRuntimeLog[] {
    const memory = this.asMemory(runtimeOrMemory);
    return this.legacy.push(memory);
  }

  next(runtimeOrMemory: IScriptRuntime | IRuntimeMemory): IRuntimeBlock | IRuntimeLog[] | undefined {
    const memory = this.asMemory(runtimeOrMemory);
    return this.legacy.next(memory);
  }

  pop(runtimeOrMemory: IScriptRuntime | IRuntimeMemory): void | IRuntimeLog[] {
    const memory = this.asMemory(runtimeOrMemory);
    this.legacy.pop(memory);
    return [{
      message: `Legacy block popped: ${this.key.toString()}`,
      level: 'info',
      timestamp: new Date(),
      context: { blockKey: this.key.toString() }
    }];
  }

  private asMemory(runtimeOrMemory: IScriptRuntime | IRuntimeMemory): IRuntimeMemory {
    if (this.isRuntime(runtimeOrMemory)) return runtimeOrMemory.memory;
    return runtimeOrMemory;
  }

  private isRuntime(x: any): x is IScriptRuntime {
    return x && typeof x === 'object' && 'handle' in x && 'memory' in x && 'stack' in x;
  }
}
