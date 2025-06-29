import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";
import { GroupType } from "../parser/timer.visitor";

export class LapFragment implements ICodeFragment {
  readonly value: GroupType;

  constructor(public group: GroupType, public image: string, public meta?: CodeMetadata) {  
    this.value = group;
  }
  readonly type: string = "lap";
  readonly fragmentType = FragmentType.Lap;
}
