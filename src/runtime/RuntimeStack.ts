import { IRuntimeBlock } from "./IRuntimeBlock";

/**
 * Concrete implementation of RuntimeStack for managing currently executing blocks.
 * This class provides stack operations for managing the execution hierarchy of runtime blocks.
 */
export class RuntimeStack {
  private blocks: IRuntimeBlock[] = [];

  /**
   * Gets the parent blocks in execution order (outermost to innermost).
   * @returns Array of parent blocks, excluding the current top block
   */
  getParentBlocks(): IRuntimeBlock[] {
    // Return all blocks except the top one (which is the current block)
    return this.blocks.slice(0, -1);
  }

  /**
   * Pushes a new block onto the stack.
   * @param block The block to push onto the stack
   */
  push(block: IRuntimeBlock): void {
    this.blocks.push(block);
    
    // Set the parent relationship
    if (this.blocks.length > 1) {
      const parentIndex = this.blocks.length - 2;
      block.parent = this.blocks[parentIndex];
    }
  }

  /**
   * Pops the current block from the stack.
   * @returns The popped block or undefined if stack is empty
   */
  pop(): IRuntimeBlock | undefined {
    return this.blocks.pop();
  }

  /**
   * Gets the current top block without removing it.
   * @returns The top block or undefined if stack is empty
   */
  peek(): IRuntimeBlock | undefined {
    return this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : undefined;
  }

  /**
   * Gets the current stack depth.
   * @returns The number of blocks in the stack
   */
  depth(): number {
    return this.blocks.length;
  }

  /**
   * Gets all blocks in the stack (for debugging/visualization).
   * @returns Array of all blocks in stack order (bottom to top)
   */
  getAllBlocks(): IRuntimeBlock[] {
    return [...this.blocks];
  }

  /**
   * Clears the entire stack.
   */
  clear(): void {
    this.blocks = [];
  }

  /**
   * Checks if the stack is empty.
   * @returns True if the stack contains no blocks
   */
  isEmpty(): boolean {
    return this.blocks.length === 0;
  }

  /**
   * Gets the root block (bottom of the stack).
   * @returns The root block or undefined if stack is empty
   */
  getRoot(): IRuntimeBlock | undefined {
    return this.blocks.length > 0 ? this.blocks[0] : undefined;
  }

  /**
   * Finds a block in the stack by its key value.
   * @param keyValue The key value to search for
   * @returns The found block or undefined
   */
  findByKey(keyValue: string): IRuntimeBlock | undefined {
    return this.blocks.find(block => (block.key as any).value === keyValue);
  }
}