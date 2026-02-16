import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class EffortFragment implements ICodeFragment {
  readonly value: string;
  readonly image: string;
  readonly origin: FragmentOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public effort: string, public meta?: CodeMetadata) {
    this.value = effort;
    this.image = effort;
  }
  readonly type: string = "effort";
  readonly fragmentType = FragmentType.Effort;
}

