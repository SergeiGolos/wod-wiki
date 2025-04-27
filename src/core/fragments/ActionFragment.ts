import { StatementFragment, SourceCodeMetadata } from "../timer.types";


export class ActionFragment implements StatementFragment {
  constructor(public action: string, public meta?: SourceCodeMetadata) { }
  type: string = "action";  
}
