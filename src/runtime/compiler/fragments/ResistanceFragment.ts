import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class ResistanceFragment implements ICodeFragment {
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;
  readonly origin: FragmentOrigin;

  constructor(value: number | undefined, public units: string) {
    this.value = { amount: value, units: units };
    this.image = value !== undefined ? `${value} ${units}` : `? ${units}`;
    // If value is undefined, this is a collectible fragment from user input
    this.origin = value === undefined ? 'user' : 'parser';
    this.behavior = value === undefined ? MetricBehavior.Hint : MetricBehavior.Defined;
  }
  readonly type: string = "resistance";
  readonly fragmentType = FragmentType.Resistance;
  readonly behavior: MetricBehavior;
} 

