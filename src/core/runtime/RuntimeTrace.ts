import { IRuntimeBlock, IRuntimeEvent, IRuntimeLog } from "../timer.types";

/**
 * Manages the runtime trace of statement execution
 * Tracks the execution flow and state of each statement node
 */
export class RuntimeTrace {
  public history: Array<IRuntimeLog> = [];
  public stack: Array<IRuntimeBlock> = [];
  /**
   * Gets traces for nodes in the stack
   * @param stack Array of statement nodes to find traces for
   * @returns Array of matching statement traces
   */
  public current(): IRuntimeBlock | undefined {
    return this.stack.length == 0
      ? undefined
      : this.stack[this.stack.length - 1];
  }

  public log(event: IRuntimeEvent) {
    if (event.name == "tick") {
      return;
    }
    const block = this.current();
    if (block) {
      this.history.push({
        blockId: block.blockId,
        blockKey: block.blockKey,
        ...event,
      });
    }
  }

  /**
   * Records a new execution of the statement stack and returns a key
   * @param stack Array of statement nodes being executed
   * @returns A unique key for this execution context
   */
  public push(block: IRuntimeBlock): IRuntimeBlock {
    this.stack.push(block);
    return block;
  }

  public fromStack<T>(
    blockFn: (block: IRuntimeBlock) => T | undefined
  ): T | undefined {
    let current = this.current();
    let outcome: T | undefined = undefined;
    do {
      outcome = blockFn(current!);
      current = current?.parent;
    } while (!outcome && current);
    return outcome;
  }

  public inStack(
    blockFn: (block: IRuntimeBlock) => void | undefined
  ): void {
    let current = this.current();
    do {
      blockFn(current!);
      current = current?.parent;
    } while (current);
  }

  public pop(): IRuntimeBlock | undefined {
    if (this.stack.length == 0) {
      return undefined;
    }

    return this.stack.pop();
  }
}
