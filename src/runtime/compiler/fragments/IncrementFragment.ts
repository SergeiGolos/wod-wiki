import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";

export class IncrementFragment implements ICodeFragment {
  readonly value: number;
  readonly increment: number;
  readonly origin: FragmentOrigin = 'parser';

  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
    this.value = this.increment;
  }
  readonly type: string = "increment";
  readonly fragmentType = FragmentType.Increment;
}

