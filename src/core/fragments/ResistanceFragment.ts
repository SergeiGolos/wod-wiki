import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class ResistanceFragment implements CodeFragment {
  constructor(public value: string, public units: string, public meta?: CodeMetadata) { }
  readonly type: string = "resistance";
  readonly fragmentType = FragmentType.Resistance;
}
