import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class TextFragment implements CodeFragment {
  constructor(public text: string, public level?: string, public meta?: CodeMetadata) { }
  type: string = "text";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, _rounds?: number): void {
    // No-op for text fragments
  }
}
