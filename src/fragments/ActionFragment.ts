import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";


export class ActionFragment implements CodeFragment {
  constructor(public action: string, public meta?: CodeMetadata) { }
  readonly type: string = "action";
  readonly fragmentType = FragmentType.Action;
}
