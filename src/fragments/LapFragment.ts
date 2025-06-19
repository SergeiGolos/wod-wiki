import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";
import { GroupType } from "../parser/timer.visitor";

export class LapFragment implements CodeFragment {
  constructor(public group: GroupType, public image: string, public meta?: CodeMetadata) {  
  }
  readonly type: string = "lap";
  readonly fragmentType = FragmentType.Lap;
}
