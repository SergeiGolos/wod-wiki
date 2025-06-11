import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class TextFragment implements CodeFragment {
  constructor(public text: string, public level?: string, public meta?: CodeMetadata) { }
  readonly type: string = "text";
  readonly fragmentType = FragmentType.Text;
}
