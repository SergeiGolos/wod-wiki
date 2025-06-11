import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";


export class ActionFragment implements CodeFragment {
  constructor(public action: string, public meta?: CodeMetadata) { }
  readonly type: string = "action";
  readonly fragmentType = FragmentType.Action;
}
