import { StatementFragment, SourceCodeMetadata } from "../timer.types";

export class ActionFragment implements StatementFragment {
  constructor(public action: string, public meta?: SourceCodeMetadata) { }
  type: string = "action";
  toPart: () => string = () => this.action;
}

export class EffortFragment implements StatementFragment {
  constructor(public effort: string, public meta?: SourceCodeMetadata) { }
  type: string = "effort";
  toPart: () => string = () => this.effort;
}
