import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RoundsFragment implements CodeFragment {
  constructor(public count: number, public meta?: CodeMetadata) { }
  type: string = "rounds";  
}
