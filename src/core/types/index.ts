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
  RuntimeAction,
  RuntimeMemory,
  RuntimeStack,
  JitCompiler,
  RuntimeBlockStrategy,
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
  EnhancedTimerHarnessResult,
  EnhancedTimerHarnessProps,
  TimeSpan,
} from './clock';

// Fragment types
export type {
  FragmentTypeString,
  FragmentColorMap,
  ParseError,
  FragmentVisualizerProps,
} from './fragments';
