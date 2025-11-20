import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class ResistanceFragment implements ICodeFragment {
  readonly value: { amount: number, units: string };
  readonly image: string;

  constructor(value: number, public units: string, public meta?: CodeMetadata) {
    this.value = { amount: value, units: units };
    this.image = `${value} ${units}`;
  }
  readonly type: string = "resistance";
  readonly fragmentType = FragmentType.Resistance;
}
