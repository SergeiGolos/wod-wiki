import { BlockKey } from "../../BlockKey";
import { IRuntimeLog, IRuntimeEvent } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";

export interface ILegacyMemoryBlockLike {
  readonly key: BlockKey;
  push(memory: any): IRuntimeEvent[];
  next(memory: any): IRuntimeEvent[];
  pop(memory: any): void;
  setRuntime?(runtime: any): void;
}

export class LegacyMemoryBlockAdapter implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceId: string[];
  readonly behaviors?: undefined;

  constructor(private readonly legacy: ILegacyMemoryBlockLike, sourceId: string[] = []) {
    this.key = legacy.key;
    this.sourceId = sourceId;
  }

  push(runtime: IScriptRuntime): IRuntimeLog[] {
    try { this.legacy.setRuntime?.(runtime); } catch {}
    const events = this.legacy.push(runtime.memory) ?? [];
    for (const e of events) {
      try { runtime.handle(e); } catch (err) {
        console.error(`[Adapter] Error handling push event ${e?.name}:`, err);
      }
    }
    return events.map(e => makeLog("info", `legacy.push emitted ${e.name}`, { event: e }));
  }

  next(runtime: IScriptRuntime): IRuntimeLog[] {
    const events = this.legacy.next(runtime.memory) ?? [];
    for (const e of events) {
      try { runtime.handle(e); } catch (err) {
        console.error(`[Adapter] Error handling next event ${e?.name}:`, err);
      }
    }
    return events.map(e => makeLog("debug", `legacy.next emitted ${e.name}`, { event: e }));
  }

  pop(runtime: IScriptRuntime): IRuntimeLog[] {
    try { this.legacy.pop(runtime.memory); } catch (err) {
      console.error(`[Adapter] Error during legacy.pop:`, err);
      return [makeLog("error", "legacy.pop failed", { err })];
    }
    return [makeLog("info", "legacy.pop completed")];
  }
}

function makeLog(level: IRuntimeLog["level"], message: string, context?: any): IRuntimeLog {
  return { level, message, timestamp: new Date(), context };
}
