import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";


export class DistanceFragment implements CodeFragment {
  constructor(public value: string, public units: string, public meta?: CodeMetadata) { }
  type: string = "distance";  
}
