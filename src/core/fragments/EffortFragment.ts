import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class EffortFragment implements CodeFragment {
  constructor(public effort: string, public meta?: CodeMetadata) { }
  readonly type: string = "effort";
  readonly fragmentType = FragmentType.Effort;
}
