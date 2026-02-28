import { sharedParser } from '../../parser/parserInstance';
import { JitCompiler } from '../../runtime/compiler/JitCompiler';

/**
 * Module-Level Services for RuntimeTestBench
 * This singleton is created once when the module loads and shared
 * across all RuntimeTestBench instances.
 * 
 * @example
 * ```typescript
 * import { globalParser } from './services/testbench-services';
 * 
 * const script = globalParser.read(codeString);
 * ```
 */
export const globalParser = sharedParser;

/**
 * Global compiler instance.
 * 
 * The TypedBlockFactory (built into JitCompiler) handles all block creation
 * directly from statement fragments. No strategy registration is needed
 * for the JIT compilation pipeline.
 * 
 * This singleton is created once when the module loads and shared
 * across all RuntimeTestBench instances.
 * 
 * @example
 * ```typescript
 * import { globalCompiler } from './services/testbench-services';
 * 
 * const blocks = globalCompiler.compile(script);
 * ```
 */
export const globalCompiler = new JitCompiler();
