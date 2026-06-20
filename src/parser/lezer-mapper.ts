import { EditorState } from '@codemirror/state';
import { ICodeStatement } from '../core/models/CodeStatement';

import { classifyStatements } from './semantic-classifier';
import { extractSyntaxFacts } from './syntax-parser';
import { dialectStack } from '../dialects/DialectStack';

/**
 * Extract statements WITHOUT running the Dialect Stack.
 *
 * Used by the parser test harness (which applies its own Dialect set) and by
 * any consumer that needs the raw classified statements before Dialect
 * processing. Production consumers should use {@link extractStatements}.
 */
export function extractStatementsRaw(state: EditorState): ICodeStatement[] {
  const facts = extractSyntaxFacts(state);
  return classifyStatements(facts);
}

/**
 * Extracts WhiteboardScript statements from the CodeMirror editor state using the Lezer tree.
 *
 * The Dialect Stack (base Units + sport Dialects + personal-overrides) runs on
 * every statement here, so every parse consumer (read(), the editor preview,
 * tests) gets fused units and sport hints uniformly. See `DialectStack.ts`.
 */
export function extractStatements(state: EditorState): ICodeStatement[] {
  const statements = extractStatementsRaw(state);
  dialectStack.processAll(statements);
  return statements;
}
