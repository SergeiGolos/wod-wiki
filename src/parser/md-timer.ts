import { EditorState } from "@codemirror/state";
import { whiteboardScriptLanguage } from "./whiteboard-script-language";
import { extractStatements, extractStatementsRaw } from "./lezer-mapper";
import { IScript, WhiteboardScript } from "./WhiteboardScript";

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
      return new WhiteboardScript(inputText, [], []);
    }

    try {
      // Ensure content ends with newline for block recognition
      const doc = inputText.endsWith('\n') ? inputText : inputText + '\n';
      const state = EditorState.create({
        doc,
        extensions: [whiteboardScriptLanguage]
      });

      const statements = extractStatements(state);

      // Lezer doesn't provide a list of ParseErrors in the same way Chevrotain does,
      // it produces a tree with error nodes. For now, we return empty errors list.
      return new WhiteboardScript(inputText, statements, []);
    } catch (error: any) {
      console.error('[MdTimerRuntime] Parse error:', error);
      return new WhiteboardScript(inputText, [], [{
        message: error?.message || 'Unknown parse error'
      }]);
    }
  }

  /**
   * Parse without running the Dialect Stack. Used by the parser test harness
   * which applies its own Dialect set. Production consumers should use {@link read}.
   */
  readWithoutDialects(inputText: string): IScript {
    if (!inputText || !inputText.trim()) {
      return new WhiteboardScript(inputText, [], []);
    }
    try {
      const doc = inputText.endsWith('\n') ? inputText : inputText + '\n';
      const state = EditorState.create({
        doc,
        extensions: [whiteboardScriptLanguage]
      });
      const statements = extractStatementsRaw(state);
      return new WhiteboardScript(inputText, statements, []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown parse error';
      console.error('[MdTimerRuntime] Parse error:', msg);
      return new WhiteboardScript(inputText, [], [{ message: msg }]);
    }
  }
}
