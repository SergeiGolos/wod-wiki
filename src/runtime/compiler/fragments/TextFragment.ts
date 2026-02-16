import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class TextFragment implements ICodeFragment {
  readonly value: { text: string, level?: string };
  readonly image: string;
  readonly origin: FragmentOrigin = 'parser';
  readonly behavior: MetricBehavior = MetricBehavior.Defined;

  constructor(public text: string, public level?: string, public meta?: CodeMetadata) {
    this.value = { text: text, level: level };
    this.image = text;
  }
  readonly type: string = "text";
  readonly fragmentType = FragmentType.Text;
}

