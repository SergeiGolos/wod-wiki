/**
 * Utility for parsing WOD block content
 * Shared by useBlockParser and useParseAllBlocks hooks
 */

import type { MdTimerRuntime } from '../../parser/md-timer';
import type { ICodeStatement } from '../../core/models/CodeStatement';
import type { ParseError } from '../types';

/**
 * Result of parsing a WOD block
 */
export interface ParseResult {
  /** Parsed statements */
  statements: ICodeStatement[];
  /** Parse errors (if any) */
  errors: ParseError[];
  /** True if parsing succeeded without errors */
  success: boolean;
}

/**
 * Parse WOD block content using the provided parser
 * 
 * This shared utility encapsulates the parsing logic used by both
 * useBlockParser and useParseAllBlocks hooks.
 * 
 * @param content - The WOD block content to parse
 * @param parser - MdTimerRuntime instance to use for parsing
 * @returns ParseResult with statements, errors, and success flag
 * 
 * @example
 * ```typescript
 * const parser = sharedParser;
 * const result = parseWodBlock('10 Push-ups', parser);
 * 
 * if (result.success) {
 *   console.log('Parsed:', result.statements);
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 */
export function parseWodBlock(
  content: string,
  parser: MdTimerRuntime
): ParseResult {
  // Handle empty content
  if (!content || content.trim().length === 0) {
    return {
      statements: [],
      errors: [],
      success: true
    };
  }

  try {
    // Parse the content
    const script = parser.read(content);
    
    // Extract statements
    const statements = script.statements || [];
    
    // Transform errors to ParseError format
    const errors: ParseError[] = (script.errors || []).map((err: any) => ({
      line: err.token?.startLine,
      column: err.token?.startColumn,
      message: err.message || 'Parse error',
      severity: 'error' as const
    }));

    return {
      statements,
      errors,
      success: errors.length === 0
    };
  } catch (error: any) {
    // Handle unexpected parsing exceptions
    return {
      statements: [],
      errors: [{
        message: error?.message || 'Unknown parse error',
        severity: 'error' as const
      }],
      success: false
    };
  }
}
