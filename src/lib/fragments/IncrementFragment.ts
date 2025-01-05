import { SourceCodeMetadata } from "../SourceDisplayBlock";
import { StatementFragment } from "../StatementFragment";


export class IncrementFragment implements StatementFragment {
  constructor(public image: string, public meta?: SourceCodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  type: string = "increment";
  increment: number;
  toPart: () => string = () => this.increment == 1 ? "⬆️" : "⬇️";
}
