import { StatementFragment, SourceCodeMetadata } from "@/types/timer.types";

export class LapFragment implements StatementFragment {
  constructor(public image: string, public meta?: SourceCodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  type: string = "lap";
  increment: number;
  toPart: () => string = () => this.image;
}
