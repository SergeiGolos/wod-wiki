/**
 * Core types for WOD Wiki
 * 
 * These are the fundamental types used throughout the library for
 * representing workout scripts, code statements, and basic data structures.
 */

import { CodeMetadata } from '../core/models/CodeMetadata';
import { ICodeFragment } from '../core/models/CodeFragment';

/**
 * Parser error information
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  token?: unknown;
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

/**
 * Represents a single code statement in a workout script
 */
export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[][];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}

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
 * Types of code fragments that can appear in workout scripts
 */
export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}

/**
 * Re-export WodScript class
 */
export type { WodScript } from '../parser/WodScript';

/**
 * Re-export BlockKey class
 */
export type { BlockKey } from '../core/models/BlockKey';

/**
 * Re-export Duration class
 */
export type { Duration } from '../core/models/Duration';

/**
 * Re-export CodeMetadata
 */
export type { CodeMetadata } from '../core/models/CodeMetadata';

/**
 * Re-export ICodeFragment
 */
export type { ICodeFragment } from '../core/models/CodeFragment';
