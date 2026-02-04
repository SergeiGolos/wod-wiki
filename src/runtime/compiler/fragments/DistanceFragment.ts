import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";


export class DistanceFragment implements ICodeFragment {
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;
  readonly origin: FragmentOrigin;

  constructor(value: number | undefined, public units: string, public meta?: CodeMetadata) {
    this.value = { amount: value, units: units };
    this.image = value !== undefined ? `${value} ${units}` : `? ${units}`;
    // If value is undefined, this is a collectible fragment from user input
    this.origin = value === undefined ? 'user' : 'parser';
  }
  readonly type: string = "distance";
  readonly fragmentType = FragmentType.Distance;
}

