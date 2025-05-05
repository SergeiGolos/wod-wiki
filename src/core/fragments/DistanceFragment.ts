import { StatementFragment, SourceCodeMetadata } from "../timer.types";


export class DistanceFragment implements StatementFragment {
  constructor(public value: string, public units: string, public meta?: SourceCodeMetadata) { }
  type: string = "distance";  
}
