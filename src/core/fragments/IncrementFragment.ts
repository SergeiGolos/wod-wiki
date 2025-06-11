import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class IncrementFragment implements CodeFragment {
  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  readonly type: string = "increment";
  readonly increment: number;
  readonly fragmentType = FragmentType.Increment;
}
