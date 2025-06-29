import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RepFragment implements ICodeFragment {
  readonly value?: number;

  constructor(public reps?: number, public meta?: CodeMetadata) { 
    this.value = reps;
  }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}
