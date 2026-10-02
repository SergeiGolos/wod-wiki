import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import { acceptCompletion, autocompletion, closeCompletion, completionStatus, moveCompletionSelection, startCompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { wqlLanguage, wqlHighlightStyle, wqlCompletionSource } from '@bitcobblers/wod-wiki-wql';
import { loadSuggestions } from './suggestionSources';

export function WqlTextEditor({ value, onChange, onSubmit, onEscape, autoFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onEscape: () => boolean;
  autoFocus?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | undefined>(undefined);
  const callbacks = useRef({ onChange, onSubmit, onEscape });
  callbacks.current = { onChange, onSubmit, onEscape };
  const replacing = useRef(false);
  const initialValue = useRef(value);

  useEffect(() => {
    if (!host.current) return;
    const source = wqlCompletionSource({
      values: async key => (await loadSuggestions(key === 'tags' ? 'tag' : key)).map(item => ({ label: item.value, detail: item.label, type: 'constant' })),
    });
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          wqlLanguage, syntaxHighlighting(wqlHighlightStyle), history(), EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'WQL', 'data-testid': 'wql-text-input' }),
          autocompletion({
            defaultKeymap: false, selectOnOpen: false,
            override: [source],
          }),
          keymap.of([
            { key: 'Mod-Enter', run: () => { callbacks.current.onSubmit(); return true; } },
            { key: 'Ctrl-Space', run: startCompletion },
            { key: 'ArrowDown', run: editor => completionStatus(editor.state) === 'active' && moveCompletionSelection(true)(editor) },
            { key: 'ArrowUp', run: editor => completionStatus(editor.state) === 'active' && moveCompletionSelection(false)(editor) },
            { key: 'Enter', run: editor => { if (!acceptCompletion(editor)) callbacks.current.onSubmit(); return true; } },
            { key: 'Escape', run: editor => closeCompletion(editor) || callbacks.current.onEscape() },
            ...historyKeymap,
          ]),
          EditorView.domEventHandlers({
            // Clicking a head/target/filter token selects it and lists its alternatives;
            // typing then replaces it, picking swaps it.
            mouseup: (event, editor) => {
              if (event.button !== 0) return false;
              let { from, to } = editor.state.selection.main;
              if (from === to) {
                const line = editor.state.doc.lineAt(from);
                const word = Array.from(line.text.matchAll(/[\w.*-]+/g)).find(m => line.from + m.index! <= from && from <= line.from + m.index! + m[0].length);
                if (!word) return false;
                from = line.from + word.index!;
                to = from + word[0].length;
                let node = syntaxTree(editor.state).resolveInner(to, -1);
                while (node.parent && !['Head', 'Filter'].includes(node.name)) node = node.parent;
                if (!['Head', 'Filter'].includes(node.name)) return false;
                editor.dispatch({ selection: { anchor: from, head: to } });
              }
              startCompletion(editor);
              return false;
            },
            keydown: (event, editor) => {
            if (event.isComposing && event.key === 'Enter') return true;
            if (event.isComposing) return false;
            if (event.key === 'Enter' || (['ArrowDown', 'ArrowUp'].includes(event.key) && completionStatus(editor.state) === 'active')) event.stopPropagation();
            return false;
          } }),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !replacing.current) callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.theme({
            '&': { width: '100%', fontSize: '14px', backgroundColor: 'transparent' },
            '&.cm-focused': { outline: 'none' },
            '.cm-content': { fontFamily: 'var(--font-mono, ui-monospace, monospace)', padding: '12px 0', minHeight: '48px' },
            '.cm-line': { padding: '0 12px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-tooltip': { backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: '8px' },
            '.cm-tooltip-autocomplete ul li': { padding: '8px 12px' },
          }),
        ],
      }),
    });
    view.current = editor;
    if (autoFocus) editor.focus();
    return () => { editor.destroy(); view.current = undefined; };
  }, [autoFocus]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    replacing.current = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    replacing.current = false;
  }, [value]);

  return <div ref={host} className="min-w-0 w-full rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring" data-testid="wql-text-editor" />;
}
