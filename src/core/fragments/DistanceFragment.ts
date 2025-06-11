import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";


export class DistanceFragment implements CodeFragment {
  constructor(public value: string, public units: string, public meta?: CodeMetadata) { }
  readonly type: string = "distance";
  readonly fragmentType = FragmentType.Distance;
}
