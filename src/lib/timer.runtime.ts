import { DisplayBlock } from "./timer.types";

export class BlockSequencer {
  constructor(private blocks: DisplayBlock[]) {}

  /**
   * Gets the next block that should run based on the current index
   * @param currentIndex The current block index (-1 if no block is running)
   * @returns The index of the next block to run, or -1 if no more blocks should run
   */
  getNextBlockIndex(currentIndex: number): number {
    // If no blocks, can't run anything
    if (!this.blocks || this.blocks.length === 0) {
      return -1;
    }

    // If no current block running, find first runnable block
    if (currentIndex === -1) {
      return this.findNextRunnableBlock(0);
    }

    // Find next block after current
    return this.findNextRunnableBlock(currentIndex + 1);
  }

  /**
   * Determines if a block is runnable (has a duration)
   */
  private isBlockRunnable(block: DisplayBlock): boolean {
    return block.duration !== undefined && block.duration >= 0;
  }

  /**
   * Finds the next runnable block starting from the given index
   */
  private findNextRunnableBlock(startIndex: number): number {
    for (let i = startIndex; i < this.blocks.length; i++) {
      if (this.isBlockRunnable(this.blocks[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Gets the initial block that should run
   * @returns The index of the first block that should run, or -1 if no blocks should run
   */
  getInitialBlockIndex(): number {
    return this.getNextBlockIndex(-1);
  }

  /**
   * Checks if there are more blocks to run after the current index
   * @param currentIndex The current block index
   * @returns True if there are more blocks to run
   */
  hasMoreBlocks(currentIndex: number): boolean {
    return this.getNextBlockIndex(currentIndex) !== -1;
  }

  /**
   * Gets all blocks that should run in sequence
   * @returns Array of block indices that will run in order
   */
  getFullSequence(): number[] {
    const sequence: number[] = [];
    let currentIndex = this.getInitialBlockIndex();
    
    while (currentIndex !== -1) {
      sequence.push(currentIndex);
      currentIndex = this.getNextBlockIndex(currentIndex);
    }

    return sequence;
  }
}
