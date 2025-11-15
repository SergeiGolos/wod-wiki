import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RepFragment implements ICodeFragment {
  readonly value?: number;
  readonly image: string;

  constructor(public reps?: number, public meta?: CodeMetadata) { 
    this.value = reps;
    this.image = reps !== undefined ? reps.toString() : '';
  }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}
