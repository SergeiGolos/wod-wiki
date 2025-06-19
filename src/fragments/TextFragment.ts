import { ICodeFragment, FragmentType } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class TextFragment implements ICodeFragment {
  readonly value: { text: string, level?: string };
  readonly image: string;

  constructor(public text: string, public level?: string, public meta?: CodeMetadata) {
    this.value = { text: text, level: level };
    this.image = text;
  }
  readonly type: string = "text";
  readonly fragmentType = FragmentType.Text;
}
