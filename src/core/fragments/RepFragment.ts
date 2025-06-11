import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class RepFragment implements CodeFragment {
  constructor(public reps?: number, public meta?: CodeMetadata) { }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}
