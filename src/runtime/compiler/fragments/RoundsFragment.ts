import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class RoundsFragment implements ICodeFragment {
  readonly value: number | string;
  readonly image: string;
  readonly origin: FragmentOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public count: number | string) {
    this.value = count;
    this.image = count.toString();
  }
  readonly type: string = "rounds";
  readonly fragmentType = FragmentType.Rounds;
}

