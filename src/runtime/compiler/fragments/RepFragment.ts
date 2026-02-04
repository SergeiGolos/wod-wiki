import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";

export class RepFragment implements ICodeFragment {
  readonly value?: number;
  readonly image: string;
  readonly origin: FragmentOrigin;

  constructor(public reps?: number, public meta?: CodeMetadata) {
    if (reps !== undefined) {
      if (reps < 0) {
        throw new Error(`Rep count cannot be negative: ${reps}`);
      }
      if (!Number.isInteger(reps)) {
        throw new Error(`Rep count must be an integer: ${reps}`);
      }
    }
    this.value = reps;
    this.image = reps !== undefined ? reps.toString() : '?';
    // If reps is undefined, this is a collectible fragment from user input
    this.origin = reps === undefined ? 'user' : 'parser';
  }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}

