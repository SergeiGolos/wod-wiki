import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RepFragment implements CodeFragment {
  constructor(public reps?: number, public meta?: CodeMetadata) { }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}
