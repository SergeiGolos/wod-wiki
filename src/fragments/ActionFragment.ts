import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";


export class ActionFragment implements ICodeFragment {
  readonly value: string;
  readonly image: string;

  constructor(public action: string, public meta?: CodeMetadata) {
    this.value = action;
    this.image = action;
  }
  readonly type: string = "action";
  readonly fragmentType = FragmentType.Action;
}
