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
