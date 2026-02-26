import { EditorState } from "@codemirror/state";
import { wodscriptLanguage } from "./wodscript-language";
import { extractStatements } from "./lezer-mapper";
import { IScript, WodScript } from "./WodScript";

/**
 * Re-implementation of MdTimerRuntime using Lezer parser for Phase 4.
 * Maintains the same interface to avoid breaking existing consumers.
 */
export class MdTimerRuntime {
  constructor() {
    // No longer needs Chevrotain Lexer/Visitor
  }

  read(inputText: string): IScript {
    // Handle empty/whitespace-only input
    if (!inputText || !inputText.trim()) {
      return new WodScript(inputText, [], []);
    }

    try {
      // Ensure content ends with newline for block recognition
      const doc = inputText.endsWith('\n') ? inputText : inputText + '\n';
      const state = EditorState.create({
        doc,
        extensions: [wodscriptLanguage]
      });

      const statements = extractStatements(state);
      
      // Lezer doesn't provide a list of ParseErrors in the same way Chevrotain does,
      // it produces a tree with error nodes. For now, we return empty errors list.
      return new WodScript(inputText, statements, []);
    } catch (error: any) {
      console.error('[MdTimerRuntime] Parse error:', error);
      return new WodScript(inputText, [], [{
        message: error?.message || 'Unknown parse error'
      }]);
    }
  }
}
