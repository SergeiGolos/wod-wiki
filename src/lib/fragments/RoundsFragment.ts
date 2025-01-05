import { SourceCodeMetadata } from "../SourceDisplayBlock";
import { StatementFragment } from "../StatementFragment";


export class RoundsFragment implements StatementFragment {
  constructor(public count: number, public meta?: SourceCodeMetadata) { }
  type: string = "rounds";
  toPart: () => string = () => `${this.count}x`;
}
