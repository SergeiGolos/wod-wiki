import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class RoundsFragment implements ICodeFragment {
  readonly value: number | string;
  readonly image: string;
  readonly origin: FragmentOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public count: number | string, public meta?: CodeMetadata) {
    this.value = count;
    this.image = count.toString();
  }
  readonly type: string = "rounds";
  readonly fragmentType = FragmentType.Rounds;
}

