import { IRuntimeLogger, IRuntimeBlock, ResultSpan } from "@/core/timer.types";


export class EmptyResultWriter implements IRuntimeLogger {
  write(runtimeBlock: IRuntimeBlock): ResultSpan[] {
    return [];
  }
}


