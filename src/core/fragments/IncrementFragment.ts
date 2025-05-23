import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class IncrementFragment implements CodeFragment {
  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  type: string = "increment";
  increment: number;
  applyToMetric(_metric: import("../RuntimeMetric").RuntimeMetric, _rounds?: number): void {
  
  }
}
