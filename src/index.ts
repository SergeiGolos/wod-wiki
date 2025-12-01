/**
 * WOD Wiki - Main Entry Point
 * 
 * A React component library for parsing, displaying, and executing workout definitions.
 * 
 * For tree-shakeable imports, use subpath imports:
 * - 'wod-wiki/core' - Parser and runtime engine
 * - 'wod-wiki/editor' - Monaco editor components
 * - 'wod-wiki/clock' - Timer and clock components
 * - 'wod-wiki/types' - TypeScript type definitions
 * 
 * @example
 * ```typescript
 * // Import specific modules for better tree-shaking
 * import { WodScript, ScriptRuntime } from 'wod-wiki/core';
 * import { WodWiki } from 'wod-wiki/editor';
 * import { DigitalClock } from 'wod-wiki/clock';
 * import type { IScriptRuntime } from 'wod-wiki/types';
 * ```
 * 
 * @module wod-wiki
 * @version 0.5.0
 */

// Re-export all modules for convenience
export * from './core-entry';
export * from './editor-entry';
export * from './clock-entry';

// Export types
// export * from './types';


// Styles
import './index.css';

// Runtime test bench (for development/testing)
export { RuntimeTestBench } from './runtime-test-bench/RuntimeTestBench';
// export * from './runtime-test-bench';
