import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RepFragment implements CodeFragment {
  constructor(public reps?: number, public meta?: CodeMetadata) { }
  type: string = "rep";  
}
