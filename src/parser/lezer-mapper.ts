import { EditorState } from '@codemirror/state';
import { ICodeStatement } from '../core/models/CodeStatement';

import { classifyStatements } from './semantic-classifier';
import { extractSyntaxFacts } from './syntax-parser';

/**
 * Extracts WhiteboardScript statements from the CodeMirror editor state using the Lezer tree.
 */
export function extractStatements(state: EditorState): ICodeStatement[] {
  const facts = extractSyntaxFacts(state);
  return classifyStatements(facts);
}
