import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { ensureSyntaxTree } from '@codemirror/language';
import { wqlLanguage, wqlCompletionSource } from '../src/language';
import type { EditorView } from '@codemirror/view';

// Regression: quote-aware insertion — whitespace values wrap outside quotes,
// raw values insert inside existing quotes (no double-quoting/truncation).
describe('quoted value insertion', () => {
  it('wraps whitespace values outside quotes, inserts raw inside quotes', async () => {
    const src = wqlCompletionSource({ values: async (key) => (key === 'text' ? [{ label: '300 air squats' }] : []) });
    const getOption = async (doc: string) => {
      const state = EditorState.create({ doc, extensions: [wqlLanguage] });
      ensureSyntaxTree(state, doc.length, 200);
      const result = await src(new CompletionContext(state, doc.length, true));
      return result?.options[0];
    };

    const runApply = async (doc: string) => {
      const option = await getOption(doc);
      let finalDoc = doc;
      const view = {
        state: { sliceDoc: (f: number, t: number) => finalDoc.slice(f, t) },
        dispatch: (spec: { changes: { from: number; to: number; insert: string } }) => {
          const { from, to, insert } = spec.changes;
          finalDoc = finalDoc.slice(0, from) + insert + finalDoc.slice(to);
        },
      };
      (option!.apply as (v: EditorView, c: unknown, f: number, t: number) => void)(view as unknown as EditorView, option!, doc.length, doc.length);
      return finalDoc;
    };

    expect(await runApply('find:note{text:')).toBe('find:note{text:"300 air squats"');
    // Already inside quotes: the raw value goes in, no double-quoting/truncation.
    expect(await runApply('find:note{text:"')).toBe('find:note{text:"300 air squats');
  });
});
