import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";


export class ActionFragment implements CodeFragment {
  constructor(public action: string, public meta?: CodeMetadata) { }
  type: string = "action";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, _rounds?: number): void {
    // No-op for action fragments
  }
}
