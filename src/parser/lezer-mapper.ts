import { EditorState } from '@codemirror/state';
import { ICodeStatement } from '../core/models/CodeStatement';

import { classifyStatements } from './semantic-classifier';
import { extractSyntaxFacts } from './syntax-parser';
import { UnitsDialect } from '../dialects/UnitsDialect';

/**
 * Base Units Dialect applied as the final parser-pipeline layer. Units are not a
 * grammar concept: the parser emits bare Number + Text, and this layer fuses the
 * adjacent pairs into dimensioned metrics. Running it here means every parse
 * consumer (read(), the editor preview, tests) gets units uniformly. Fusion is
 * idempotent, so the compile-time Dialect Stack may run additional unit-bearing
 * dialects on top without double-counting.
 */
const baseUnits = new UnitsDialect();

/**
 * Extracts WhiteboardScript statements from the CodeMirror editor state using the Lezer tree.
 */
export function extractStatements(state: EditorState): ICodeStatement[] {
  const facts = extractSyntaxFacts(state);
  const statements = classifyStatements(facts);
  for (const statement of statements) {
    baseUnits.transform(statement);
  }
  return statements;
}
