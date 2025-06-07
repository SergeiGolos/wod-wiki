import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class EffortFragment implements CodeFragment {
  constructor(public effort: string, public meta?: CodeMetadata) { }
  readonly type: string = "effort";
  readonly fragmentType = FragmentType.Effort;
}
