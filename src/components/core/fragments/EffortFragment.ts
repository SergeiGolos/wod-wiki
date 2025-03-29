import { StatementFragment, SourceCodeMetadata } from "@/types/timer.types";

export class EffortFragment implements StatementFragment {
  constructor(public effort: string, public meta?: SourceCodeMetadata) { }
  type: string = "effort";
  toPart: () => string = () => this.effort;
}
