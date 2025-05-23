import { IRuntimeBlock } from "./IRuntimeBlock";
import { IRuntimeLog } from "./IRuntimeLog";
import { RuntimeJit } from "./runtime/RuntimeJit";
import { RuntimeScript } from "./runtime/RuntimeScript";
import { RuntimeStack } from "./runtime/RuntimeStack";
import { IRuntimeAction } from "./IRuntimeAction";
import { ResultSpanRegistry } from "./metrics/ResultSpanRegistry";

export interface ITimerRuntime {
  code: string;
  jit: RuntimeJit;
  trace: RuntimeStack;
  history: Array<IRuntimeLog>;
  script: RuntimeScript;
  // Registry for ResultSpans
  registry?: ResultSpanRegistry;
  apply(actions: IRuntimeAction[], source: IRuntimeBlock): void;
  push(block: IRuntimeBlock | undefined): IRuntimeBlock;
  pop(): IRuntimeBlock | undefined;
  reset(): void;
}
