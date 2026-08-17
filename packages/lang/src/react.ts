/**
 * @wod-wiki/lang/react
 * React hooks and components for the Whiteboard Language runtime.
 */

import { parseScript, ScriptRuntime, type ExecutionResult } from './index';

export interface UseScriptRuntimeOptions {
  dialect?: string;
}

export function useScriptRuntime(source: string, options: UseScriptRuntimeOptions = {}): ExecutionResult {
  const parsed = parseScript(source, options);
  const runtime = new ScriptRuntime(parsed);
  return runtime.execute();
}
