/**
 * Re-export IJitCompiler from IScriptRuntime where it is co-defined alongside
 * IScriptRuntime to prevent a mutual-import cycle between the two files.
 */
export type { IJitCompiler } from './IScriptRuntime';
