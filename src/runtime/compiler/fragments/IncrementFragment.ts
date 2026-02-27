import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class IncrementFragment implements ICodeFragment {
  readonly value: number;
  readonly increment: number;
  readonly origin: FragmentOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Hint;

  constructor(public image: string) {
    this.increment = image == "^" ? 1 : -1;
    this.value = this.increment;
  }
  readonly type: string = "increment";
  readonly fragmentType = FragmentType.Increment;
}

