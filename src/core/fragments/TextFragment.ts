import { SourceCodeMetadata, StatementFragment } from "../wod-lang/timer.types";

export class TextFragment implements StatementFragment {
  constructor(public text: string, public level?: string, public meta?: SourceCodeMetadata) { }
  type: string = "text";
  toPart: () => string = () => this.text;
}
