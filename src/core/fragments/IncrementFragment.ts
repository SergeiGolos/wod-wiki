import { StatementFragment, SourceCodeMetadata } from "../timer.types";

export class IncrementFragment implements StatementFragment {
  constructor(public image: string, public meta?: SourceCodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  type: string = "increment";
  increment: number;
}
