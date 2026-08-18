import type { ICodeStatement } from '../models/CodeStatement';
import type { ParseError } from './section';

export type { ParseError };

/**
 * Represents a parsed workout script
 */
export interface IScript {
  source: string;
  statements: ICodeStatement[];
  errors?: ParseError[];
  getIds(ids: (number | string)[]): ICodeStatement[];
  getId(id: number | string): ICodeStatement | undefined;
  getAt(index: number): ICodeStatement | undefined;
}
