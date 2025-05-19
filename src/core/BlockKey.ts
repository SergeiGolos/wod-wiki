import { JitStatement } from "./JitStatement";
import { BlockKeyFragment } from "./BlockKeyFragment";

export class BlockKey {
  public key: BlockKeyFragment[] = [];  
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
    return this.key.map((key) => key.ids.join(",")).join("|");
  }
}
