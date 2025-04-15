import { StatementFragment, SourceCodeMetadata } from "../timer.types";
import { GroupType } from "../parser/timer.visitor";

export class LapFragment implements StatementFragment {
  constructor(public group: GroupType, public image: string, public meta?: SourceCodeMetadata) {  
  }
  type: string = "lap";  
  toPart: () => string = () => this.image;
}
