/**
 * Interface for code statements referenced by BlockKey
 */
interface ICodeStatement {
  id: string;
  // Other properties would be defined here
}

/**
 * BlockKey is used to uniquely identify and reference blocks for metrics, results, and state tracking.
 */
export class BlockKey {
  /** Unique Value generated every time a block is created or cloned */
  public readonly traceId: string;
  
  /** Unique value of a Block that the key is generated for */
  public readonly blockId: string;
  
  /** List of ICodeStatement ids that compose this block */
  public readonly sourceIds: string[];
  
  /** The unique entry into the blocks */
  private _index: number;
  
  /** List of Source Ids of the child element of the block */
  public children: readonly string[];

  /**
   * Creates a new BlockKey instance
   * @param blockId Unique identifier for the block (required)
   * @param sourceIds List of source statement IDs that compose this block
   * @param children List of child element source IDs
   */
  constructor(blockId: string, sourceIds: string[] = [], children: string[] = []) {
    this.traceId = this.generateUniqueId();
    this.blockId = blockId;
    this.sourceIds = [...sourceIds];
    this.children = Object.freeze([...children]);
    this._index = 0;
  }

  /**
   * The current index value
   */
  get index(): number {
    return this._index;
  }

  /**
   * Tracks the current round of the block based on the index and the children count
   */
  get round(): number {
    // If there are no children, round is the same as index
    if (this.children.length === 0) {
      return this._index;
    }
    
    // Otherwise, divide index by number of children to get current round
    return Math.floor(this._index / this.children.length);
  }

  /**
   * Returns the index and id of the next child
   * @returns Object containing the index and id of the next child
   */
  nextChild(): { index: number; id: string } {
    if (this.children.length === 0) {
      return { index: this._index, id: '' };
    }
    
    const childIndex = this._index % this.children.length;
    return {
      index: childIndex,
      id: this.children[childIndex]
    };
  }

  /**
   * Increments the index by the specified count
   * @param count Number to increment the index by (default: 1)
   */
  add(count: number = 1): void {
    this._index += count;
  }

  /**
   * Returns string representation of the key
   */
  toString(): string {
    return `${this.blockId}:${this.traceId}:${this._index}`;
  }

  /**
   * Generates a unique identifier
   * @private
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}