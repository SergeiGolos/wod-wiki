/**
 * WOD Wiki - Main Entry Point
 * 
 * A React component library for parsing, displaying, and executing workout definitions.
 * 
 * For tree-shakeable imports, use subpath imports:
 * - 'wod-wiki/core' - Parser and runtime engine
 * - 'wod-wiki/editor' - CodeMirror editor components
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

// Note: Types are not re-exported here to avoid duplicate exports.
// Use 'wod-wiki/types' or import types from specific modules.


// Styles
import './index.css';


// export * from './runtime-test-bench';
