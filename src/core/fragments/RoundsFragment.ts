import { SourceCodeMetadata, StatementFragment } from "@/types/timer.types";

export class RoundsFragment implements StatementFragment {
  constructor(public count: number, public meta?: SourceCodeMetadata) { }
  type: string = "rounds";
  toPart: () => string = () => `${this.count}`;
}
