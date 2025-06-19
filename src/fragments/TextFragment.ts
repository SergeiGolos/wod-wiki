import { CodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class TextFragment implements CodeFragment {
  constructor(public text: string, public level?: string, public meta?: CodeMetadata) { }
  readonly type: string = "text";
  readonly fragmentType = FragmentType.Text;
}
