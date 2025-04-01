import { SourceCodeMetadata, StatementFragment } from "../timer.types";

export class RoundsFragment implements StatementFragment {
  constructor(public count: number, public meta?: SourceCodeMetadata) { }
  type: string = "rounds";
  toPart: () => string = () => `${this.count}`;
}
