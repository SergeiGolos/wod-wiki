/**
 * WOD Wiki Types
 * 
 * Centralized type exports for the WOD Wiki library.
 * Import types from here for tree-shakeable, type-only imports.
 * 
 * @example
 * ```typescript
 * import type { IScriptRuntime, IRuntimeBlock } from 'wod-wiki/types';
 * ```
 */

// Core types
export type {
  IScript,
  ICodeStatement,
  IBlockKey,
  IDuration,
  WodScript,
  BlockKey,
  Duration,
  CodeMetadata,
  ICodeFragment,
} from './core';

export { FragmentType } from './core';

// Runtime types
export type {
  IScriptRuntime,
  IRuntimeBlock,
  IRuntimeAction,
  MemorySearchCriteria,
  IMemoryReference,
  TypedMemoryReference,
  IRuntimeBlockStrategy,
  ScriptRuntime,
  RuntimeBlock,
  RuntimeMemory,
  RuntimeStack,
  JitCompiler,
  ICodeStatement as RuntimeCodeStatement,
} from './runtime';

// Exercise types
export {
  Muscle,
  Force,
  Level,
  Mechanic,
  Equipment,
  Category,
} from './exercise';

export type { Exercise } from './exercise';

// Provider types
export type {
  ExercisePathEntry,
  ExercisePathGroup,
  ExercisePathIndex,
  ExerciseDataProvider,
  WorkoutDataProvider,
  WorkoutMetadata,
} from './providers';

// Editor types
export type {
  WodWikiProps,
  MarkdownEditorProps,
  WodBlock,
  WodWikiTokenHint,
  WodWikiToken,
  ExercisePathIndex as EditorExercisePathIndex,
  ExercisePathEntry as EditorExercisePathEntry,
} from './editor';

// Clock types
export type {
  WorkoutType,
  DigitalClockProps,
  ClockAnchorProps,
  TimerHarnessResult,
  TimerHarnessProps,
  TimeSpan,
} from './clock';

// Fragment types
// Note: FragmentTypeString and FragmentColorMap moved to src/views/runtime/fragmentColorMap.ts
export type {
  ParseError,
  FragmentVisualizerProps,
} from './fragments';
