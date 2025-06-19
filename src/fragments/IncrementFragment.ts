import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class IncrementFragment implements ICodeFragment {
  readonly value: number;
  readonly increment: number;

  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
    this.value = this.increment;
  }
  readonly type: string = "increment";
  readonly fragmentType = FragmentType.Increment;
}
