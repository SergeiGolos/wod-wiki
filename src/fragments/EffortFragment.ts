import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class EffortFragment implements ICodeFragment {
  readonly value: string;
  readonly image: string;

  constructor(public effort: string, public meta?: CodeMetadata) {
    this.value = effort;
    this.image = effort;
  }
  readonly type: string = "effort";
  readonly fragmentType = FragmentType.Effort;
}
