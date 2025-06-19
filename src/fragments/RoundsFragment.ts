import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RoundsFragment implements CodeFragment {
  constructor(public count: number, public meta?: CodeMetadata) { }
  readonly type: string = "rounds";
  readonly fragmentType = FragmentType.Rounds;
}
