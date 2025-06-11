import { IRuntimeBlock } from "./IRuntimeBlock";
import { IRuntimeLog } from "./IRuntimeLog";
import { RuntimeJit } from "./runtime/RuntimeJit";
import { RuntimeStack } from "./runtime/RuntimeStack";
import { IRuntimeAction } from "./IRuntimeAction";
import { IRuntimeScript } from "./WodRuntimeScript";

export interface ITimerRuntime {
  script: IRuntimeScript;
  trace: RuntimeStack;
  history: Array<IRuntimeLog>;    

  jit: RuntimeJit;
      
  apply(actions: IRuntimeAction[], source: IRuntimeBlock): void;

  push(block: IRuntimeBlock | undefined): IRuntimeBlock;
  pop(): IRuntimeBlock | undefined;  
}
