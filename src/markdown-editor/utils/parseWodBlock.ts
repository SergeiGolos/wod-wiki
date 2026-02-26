/**
 * Utility for parsing WOD block content using the Lezer parser.
 */

import { EditorState } from "@codemirror/state";
import { wodscriptLanguage } from "../../parser/wodscript-language";
import { extractStatements } from "../../parser/lezer-mapper";
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
 * Parse WOD block content using the Lezer-based parser.
 * 
 * @param content - The WOD block content to parse
 * @returns ParseResult with statements, errors, and success flag
 */
export function parseWodBlock(
  content: string
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
    // Create a temporary EditorState to use the Lezer parser
    // Ensure content ends with newline for block recognition if needed
    const doc = content.endsWith('\n') ? content : content + '\n';
    const state = EditorState.create({
      doc,
      extensions: [wodscriptLanguage]
    });

    // Extract statements using the mapper
    const statements = extractStatements(state);
    
    // Lezer handles errors gracefully by creating error nodes
    // For now we return success true unless we want to explicitly find error nodes
    return {
      statements,
      errors: [],
      success: true
    };
  } catch (error: any) {
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
