import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeLog } from "./EventHandler";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IBehavior } from "./IBehavior";

type HookName = "onPush" | "onNext" | "onPop";

export function runOnPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
  return runBehaviorHook("onPush", runtime, block);
}

export function runOnNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
  return runBehaviorHook("onNext", runtime, block);
}

export function runOnPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
  return runBehaviorHook("onPop", runtime, block);
}

function runBehaviorHook(hook: HookName, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
  const behaviors = getBehaviors(block);
  const allLogs: IRuntimeLog[] = [];

  for (const behavior of behaviors) {
    const fn = (behavior as any)[hook] as ((r: IScriptRuntime, b: IRuntimeBlock) => IRuntimeLog[]) | undefined;
    if (typeof fn !== "function") continue;

    try {
      // Call the hook with the behavior instance as `this` to preserve context for class methods
      const logs = fn.call(behavior as any, runtime, block) ?? [];
      for (const log of logs) {
        logToConsole(behavior, hook, block, log);
        allLogs.push(log);
      }
    } catch (err) {
      // Never let a behavior crash the runtime
      console.error(`[Behavior:${hook}] ${(behavior as any)?.constructor?.name ?? "<anon>"} threw`, err);
    }
  }

  return allLogs;
}

function getBehaviors(block: IRuntimeBlock): IBehavior[] {
  const anyBlock = block as any;
  if (Array.isArray(anyBlock.behaviors)) return anyBlock.behaviors as IBehavior[];
  if (typeof anyBlock.getBehaviors === "function") {
    const result = anyBlock.getBehaviors();
    return Array.isArray(result) ? (result as IBehavior[]) : [];
  }
  return [];
}

function logToConsole(behavior: IBehavior, hook: HookName, block: IRuntimeBlock, log: IRuntimeLog) {
  const behaviorName = (behavior as any)?.constructor?.name ?? "<anon>";
  const blockName = getBlockName(block);
  try {
    console.log(`[Behavior:${hook}] ${behaviorName} @ ${blockName}:`, log);
  } catch {
    // Fallback if log isn't serializable
    console.log(`[Behavior:${hook}] ${behaviorName} @ ${blockName}:`, String(log?.message ?? ""));
  }
}

function getBlockName(block: IRuntimeBlock): string {
  const anyBlock = block as any;
  return anyBlock.name ?? anyBlock.id ?? anyBlock.key?.toString?.() ?? "<block>";
}
