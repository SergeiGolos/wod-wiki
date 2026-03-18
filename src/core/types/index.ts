/**
 * WOD Wiki Types
 * 
 * Centralized type exports for the WOD Wiki library.
 * Import types from here for type-only imports.
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
  IMetric,
} from './core';

export { MetricType } from './core';

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

// Editor types (Proxied from components/Editor/types)
export type {
  WodBlock,
  WorkoutResults,
  WodBlockState,
  ParseError,
  WorkoutMetricFragment,
} from '../../components/Editor/types';

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
export type {
  MetricVisualizerProps,
} from './metrics';
