/**
 * Core types for WOD Wiki
 *
 * These are the fundamental types used throughout the library for
 * representing workout scripts, code statements, and basic data structures.
 */

/**
 * Parser error information
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  token?: unknown;
  excerpt?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Represents a parsed workout script
 */
export interface IScript {
  source: string;
  statements: ICodeStatement[];
  errors?: ParseError[] | undefined;
  getIds(ids: number[]): ICodeStatement[];
  getId(id: number): ICodeStatement | undefined;
  getAt(index: number): ICodeStatement | undefined;
}

import type { ICodeStatement } from '../models/CodeStatement';
export type { ICodeStatement };

/**
 * Unique identifier for runtime blocks
 */
export interface IBlockKey {
  readonly value: string;
  toString(): string;
  valueOf(): string;
  equals(other: IBlockKey): boolean;
}

/**
 * Represents a duration with individual time components
 */
export interface IDuration {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  original?: number;
}

/**
 * Types of code metrics that can appear in workout scripts
 */
export enum MetricType {
  Time = 'time',
  Duration = 'duration',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance',
  Elapsed = 'elapsed',
  Total = 'total',
  Spans = 'spans',
  SystemTime = 'system-time'
}


/** Re-exports */
export type { BlockKey } from '../models/BlockKey';
export type { Duration } from '../models/Duration';
export type { CodeMetadata } from '../models/CodeMetadata';
export type { IMetric } from '../models/Metric';
