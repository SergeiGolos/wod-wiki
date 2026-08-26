import { WhiteboardScript } from './WhiteboardScript';
import { extractStatements, extractStatementsRaw } from './lezer-mapper';
import { parser } from '../grammar/parser';

export interface ParseOptions {
  dialect?: string;
  sport?: string;
  strict?: boolean;
  withoutDialects?: boolean;
}

/**
 * Parses Whiteboard Script source directly into a WhiteboardScript AST
 * with 0 DOM / EditorState dependencies.
 *
 * @param inputText Raw Whiteboard Script text.
 * @param options Parse options including dialect/sport fence suffix and strictness.
 */
export function parseScript(inputText: string, options: ParseOptions = {}): WhiteboardScript {
  if (!inputText || !inputText.trim()) {
    return new WhiteboardScript(inputText, [], []);
  }

  try {
    const doc = inputText.endsWith('\n') ? inputText : inputText + '\n';
    const tree = parser.parse(doc);
    const sport = options.sport ?? options.dialect;
    const statements = options.withoutDialects
      ? extractStatementsRaw(inputText, tree)
      : extractStatements(inputText, tree, sport);

    return new WhiteboardScript(inputText, statements, []);
  } catch (error: any) {
    const msg = error?.message || 'Unknown parse error';
    return new WhiteboardScript(inputText, [], [{ message: msg }]);
  }
}
