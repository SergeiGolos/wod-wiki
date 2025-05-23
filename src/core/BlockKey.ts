import { JitStatement } from "./JitStatement";
import { BlockKeyFragment } from "./BlockKeyFragment";
import { IRuntimeBlock } from "./IRuntimeBlock";

export class BlockKey {
  public key: BlockKeyFragment[] = [];
  public index: number = 0;

  public static create(block: IRuntimeBlock): BlockKey {
    const newKey = new BlockKey();
    let current : IRuntimeBlock | undefined = block;
    while (current && current.sources) {
      newKey.push(current.sources, current.blockKey?.index ?? 0);
      current = current.parent;
    }
    return newKey;
  }

  /**
   * Create a BlockKey from its string representation
   * @param str The string representation of a BlockKey, like "1,2(0)|3(1)"
   * @returns A new BlockKey instance
   */
  public static fromString(str: string): BlockKey {
    const newKey = new BlockKey();
    
    // Handle empty or invalid input
    if (!str) return newKey;

    try {
      // Split by | to get fragments
      const fragments = str.split('|');
      
      for (const fragment of fragments) {
        // Extract ids and index from fragment like "1,2,3(0)"
        const match = fragment.match(/^([\d,]+)\((\d+)\)$/);
        
        if (match) {
          const [, idsStr, indexStr] = match;
          const ids = idsStr.split(',').map(id => parseInt(id, 10));
          const index = parseInt(indexStr, 10);
          
          newKey.key.push(new BlockKeyFragment(ids, index));
        }
      }
    } catch (error) {
      console.error('Error parsing BlockKey string:', error);
    }
    
    return newKey;
  }

  push(statements: JitStatement[], index: number) {
    this.key.push(
      new BlockKeyFragment(statements.map((s) => s.id), index));
  }

  not(other: BlockKey): BlockKeyFragment[] {
    const keys = this.key;
    const otherKeys = other.key;
    return keys.filter((key) => !otherKeys.includes(key));
  }

  toString() {
    return this.key.map((key) => key.ids.join(",") + "(" + key.index + ")").join("|");
  }
}
