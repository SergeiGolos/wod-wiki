import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class RoundsFragment implements ICodeFragment {
  readonly value: number;
  readonly image: string;

  constructor(public count: number, public meta?: CodeMetadata) {
    this.value = count;
    this.image = count.toString();
  }
  readonly type: string = "rounds";
  readonly fragmentType = FragmentType.Rounds;
}
