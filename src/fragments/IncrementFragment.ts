import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class IncrementFragment implements CodeFragment {
  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  readonly type: string = "increment";
  readonly increment: number;
  readonly fragmentType = FragmentType.Increment;
}
