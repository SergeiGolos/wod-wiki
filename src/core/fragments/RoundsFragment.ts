import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class RoundsFragment implements CodeFragment {
  constructor(public count: number, public meta?: CodeMetadata) { }
  readonly type: string = "rounds";
  readonly fragmentType = FragmentType.Rounds;
}
