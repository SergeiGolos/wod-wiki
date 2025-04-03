import { StatementFragment, SourceCodeMetadata } from "../timer.types";

export class LapFragment implements StatementFragment {
  constructor(public image: string, public meta?: SourceCodeMetadata) {
    this.laps = image as any * 1;
  }
  type: string = "lap";
  laps: number;
  toPart: () => string = () => this.image;
}
