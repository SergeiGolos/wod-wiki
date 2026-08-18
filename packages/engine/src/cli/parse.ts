/**
 * Headless Parse Command Runner
 *
 * Parses Whiteboard Script source text and emits a versioned IR parse-tree envelope.
 */

import { createParser } from '../parser/parserInstance';
import type { WhiteboardScript } from '../parser/WhiteboardScript';
import { createIRFile, buildStatementTree, type WodWikiIRFile, type StatementNode } from '../ir';

export class ParseSyntaxError extends Error {
  constructor(
    public readonly errors: Array<{ message: string; line?: number }>,
    message: string = 'Parse error in Whiteboard Script',
  ) {
    const details = errors.map((e) => e.message).join('; ');
    super(`${message}: ${details}`);
    this.name = 'ParseSyntaxError';
  }
}

export interface ParseOptions {
  sport?: string;
  sourceLabel?: string;
}

/**
 * Parses Whiteboard Script source directly into a StatementNode IR envelope.
 */
export function runParse(
  source: string,
  options: ParseOptions = {},
): WodWikiIRFile<StatementNode> {
  const parser = createParser();
  const script = parser.read(source, options.sport) as WhiteboardScript;

  if (script.errors && script.errors.length > 0) {
    throw new ParseSyntaxError(script.errors);
  }

  const tree = buildStatementTree(script);
  return createIRFile('parse-tree', tree, options.sourceLabel ?? 'cli:wod parse');
}
