import { StatementKey, StatementNode } from "../timer.types";

/**
 * Represents a runtime trace of a program.
 */
export class RuntimeTrace {
  private trace: Map<number, [number, number]> = new Map();
  public history: StatementKey[] = [];

  clear(): void {
    this.trace.clear();
    this.history = [];
  }

  get(id: number): number {
    return this.trace.get(id)?.[0] ?? 0;
  }

  getTotal(id: number): number {
    return this.trace.get(id)?.[1] ?? 0;
  }

  /**
   * Convenience accessor: returns the **upcoming** round index for the given node.
   * If the node has not been executed yet this will return `1`.
   * Equivalent to `get(id) + 1` but centralised so callers do not need to
   * understand the trace internals.
   */
  nextRound(id: number): number {
    return this.get(id) + 1;
  }

  set(stack: StatementNode[]): StatementKey {
    var key = new StatementKey(this.history.length + 1);
    var previous = this.history.length > 0
      ? this.history[this.history.length - 1]
      : undefined;

    for (const node of stack) {
      const index = (this.trace.get(node.id)?.[0] ?? 0) + 1;
      const total = this.getTotal(node.id) + 1;
      this.trace.set(node.id, [index, total]);
      key.push(node.id, index);
    }

    this.history.push(key);
    if (previous) {
      const diff = previous.not(key);
      for (const id of diff) {
        const total = this.getTotal(id);
        this.trace.set(id, [0, total]);
      }
    }

    return key;
  } 
}
