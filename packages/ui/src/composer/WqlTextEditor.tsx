import { createElement, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChartNoAxesCombined, ListFilter, Search, Tag } from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder, type KeyBinding } from '@codemirror/view';
import { cursorDocEnd, cursorDocStart, cursorPageDown, cursorPageUp, history, historyKeymap } from '@codemirror/commands';
import {
  acceptCompletion, autocompletion, closeCompletion, completionStatus, currentCompletions, moveCompletionSelection,
  setSelectedCompletion, startCompletion,
} from '@codemirror/autocomplete';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { parseQuery, supportsWqlFilterKey, wqlCompletionSource, wqlHighlightStyle, wqlLanguage } from '@bitcobblers/wod-wiki-wql';
import { loadSuggestions } from './suggestionSources';

const completionIcons = {
  search: renderToStaticMarkup(createElement(Search, { size: 16 })),
  metric: renderToStaticMarkup(createElement(ChartNoAxesCombined, { size: 16 })),
  filter: renderToStaticMarkup(createElement(ListFilter, { size: 16 })),
  value: renderToStaticMarkup(createElement(Tag, { size: 16 })),
};

/** Slot starts Tab/Shift-Tab hops between: head, each filter key, each filter
 *  value, grouping dimensions and suffix nodes (rollup). */
const SLOT_NODES: Record<string, true> = { Head: true, Filter: true, TagValue: true, Rollup: true };

function slotPositions(state: EditorState): number[] {
  const slots: number[] = [];
  syntaxTree(state).iterate({
    enter: node => {
      if (SLOT_NODES[node.name]) slots.push(node.from);
      else if (node.name === 'Word' && node.node.parent?.name === 'GroupBy') slots.push(node.from);
      return true;
    },
  });
  return slots.sort((a, b) => a - b);
}

function advanceSlot(view: EditorView, dir: 1 | -1): boolean {
  const head = view.state.selection.main.head;
  const slots = slotPositions(view.state);
  const next = dir > 0 ? slots.find(slot => slot > head) : [...slots].reverse().find(slot => slot < head);
  if (next === undefined) return false;
  view.dispatch({ selection: { anchor: next }, scrollIntoView: true });
  return true;
}

/** Parse-error and ignored-filter squiggles. Errors sit on the Lezer error
 *  nodes (whole query as fallback); warnings sit on the exact filter text the
 *  target's capability table rejects — unsupported key or operator alike. */
export function wqlLint(view: EditorView): Diagnostic[] {
  const doc = view.state.doc.toString();
  if (!doc.trim()) return [];
  const ast = parseQuery(doc);
  if (ast.error) {
    const spans: { from: number; to: number }[] = [];
    syntaxTree(view.state).iterate({
      enter: node => {
        if (node.type.isError) spans.push({ from: node.from, to: node.to });
        return true;
      },
    });
    return (spans.length ? spans : [{ from: 0, to: doc.length }]).map(span => {
      const to = Math.min(Math.max(span.to, span.from + 1), doc.length);
      return { from: Math.min(span.from, to - 1), to, severity: 'error' as const, message: ast.error! };
    });
  }
  const filters: { from: number; to: number; text: string }[] = [];
  syntaxTree(view.state).iterate({
    enter: node => {
      if (node.name === 'Filter') filters.push({ from: node.from, to: node.to, text: doc.slice(node.from, node.to) });
      return true;
    },
  });
  if (filters.length !== ast.filters.length) return [];
  const where = ast.family === 'find' ? ast.target : 'this query';
  const out: Diagnostic[] = [];
  ast.filters.forEach((filter, index) => {
    if (supportsWqlFilterKey(ast.family === 'find' ? ast.target : '', ast.family, filter.key)) return;
    const node = filters[index]!;
    out.push({
      from: node.from,
      to: node.to,
      severity: 'warning',
      message: /^[^\s:]+\s*[<>=~]/.test(node.text)
        ? `Operators on "${filter.key}" are ignored for ${where}`
        : `Filter "${filter.key}" is ignored for ${where}`,
    });
  });
  return out;
}

/** Key bindings shared with the regression tests: completion-first navigation
 *  (wrapping via moveCompletionSelection, page via `by: 'page'` clamps, Home/
 *  End select first/last row), Tab accepts-then-hops the next syntactic slot
 *  and Shift-Tab the previous, Enter accepts or closes-and-submits, Escape
 *  closes then blurs. Snippet fields keep their own higher-precedence
 *  Tab/Shift-Tab bindings. While an IME composition is active
 *  (`view.compositionStarted`, true from compositionstart to compositionend)
 *  every binding bows out; ArrowLeft/Right stay native cursor motion. */
export function wqlEditorKeymap(onSubmit: () => void, onEscape: () => boolean): KeyBinding[] {
  return [
    { key: 'Mod-Enter', run: () => { onSubmit(); return true; } },
    { key: 'Ctrl-Space', run: startCompletion },
    { key: 'ArrowDown', run: view => completionStatus(view.state) === 'active' && moveCompletionSelection(true)(view) },
    { key: 'ArrowUp', run: view => completionStatus(view.state) === 'active' && moveCompletionSelection(false)(view) },
    { key: 'PageUp', run: view => completionStatus(view.state) === 'active' ? moveCompletionSelection(false, 'page')(view) : cursorPageUp(view) },
    { key: 'PageDown', run: view => completionStatus(view.state) === 'active' ? moveCompletionSelection(true, 'page')(view) : cursorPageDown(view) },
    {
      key: 'Home',
      run: view => completionStatus(view.state) === 'active'
        ? (view.dispatch({ effects: setSelectedCompletion(0) }), true)
        : cursorDocStart(view),
    },
    {
      key: 'End',
      run: view => completionStatus(view.state) === 'active'
        ? (view.dispatch({ effects: setSelectedCompletion(currentCompletions(view.state).length - 1) }), true)
        : cursorDocEnd(view),
    },
    {
      key: 'Tab',
      run: view => {
        if (view.compositionStarted) return false;
        const accepted = acceptCompletion(view);
        return advanceSlot(view, 1) || accepted;
      },
    },
    {
      key: 'Shift-Tab',
      run: view => {
        if (view.compositionStarted) return false;
        const accepted = acceptCompletion(view);
        return advanceSlot(view, -1) || accepted;
      },
    },
    {
      key: 'Enter',
      run: view => {
        if (view.compositionStarted) return false;
        if (acceptCompletion(view)) return true;
        closeCompletion(view);
        onSubmit();
        return true;
      },
    },
    // First Escape closes the popup; the second blurs back to the host
    // (onEscape) or the editor itself — never two levels at once.
    { key: 'Escape', run: view => view.compositionStarted || (closeCompletion(view) || onEscape() || (view.contentDOM.blur(), true)) },
    ...historyKeymap,
  ];
}

export function WqlTextEditor({ value, onChange, onSubmit, onEscape, placeholder, autoFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onEscape: () => boolean;
  /** Shown while the draft is empty. */
  placeholder?: string;
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
          ...(placeholder ? [cmPlaceholder(placeholder)] : []),
          EditorView.contentAttributes.of({ 'aria-label': 'WQL', 'data-testid': 'wql-text-input' }),
          autocompletion({
            defaultKeymap: false, selectOnOpen: false,
            // Keyboard nav/accept must never wait out the pointer-intent delay.
            interactionDelay: 0,
            override: [source],
            icons: false,
            addToOptions: [{ position: 20, render: completion => {
              const icon = document.createElement('span');
              icon.className = 'wql-completion-icon';
              icon.setAttribute('aria-hidden', 'true');
              icon.innerHTML = completion.label === 'find' ? completionIcons.search
                : completion.type === 'keyword' || completion.type === 'variable' ? completionIcons.metric
                : completion.type === 'property' ? completionIcons.filter : completionIcons.value;
              return icon;
            } }],
          }),
          linter(wqlLint),
          keymap.of(wqlEditorKeymap(
            () => callbacks.current.onSubmit(),
            () => callbacks.current.onEscape(),
          )),
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
              // IME safety: while composing (or once a composition has started
              // and not yet ended) swallow every key this editor owns so no
              // accept/close/navigation fires mid-composition.
              if (event.isComposing || editor.compositionStarted) return true;
              if (event.key === 'Enter' || event.key === 'Escape' || (['ArrowDown', 'ArrowUp'].includes(event.key) && completionStatus(editor.state) === 'active')) event.stopPropagation();
              return false;
            },
          }),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !replacing.current) callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.theme({
            '&': { width: '100%', fontSize: '14px', backgroundColor: 'transparent' },
            '&.cm-focused': { outline: 'none' },
            '.cm-content': { fontFamily: 'var(--font-mono, ui-monospace, monospace)', padding: '12px 0', minHeight: '48px' },
            '.cm-line': { padding: '0 12px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-placeholder': { color: 'hsl(var(--muted-foreground))' },
            '.cm-tooltip': {
              backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))', borderRadius: '12px',
              boxShadow: '0 8px 24px rgb(0 0 0 / 0.16)',
              fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)', fontSize: '14px',
            },
            '.cm-tooltip-autocomplete': { overflow: 'hidden', minWidth: 'min(18rem, calc(100vw - 2rem))', maxWidth: 'calc(100vw - 2rem)' },
            '.cm-tooltip-autocomplete > ul': { padding: '4px', maxHeight: 'min(20rem, 45vh)', overscrollBehavior: 'contain' },
            '.cm-tooltip-autocomplete > ul > li': {
              display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px',
              padding: '8px 10px', borderRadius: '8px', lineHeight: '20px',
            },
            '.cm-tooltip-autocomplete > ul > li:hover': { backgroundColor: 'hsl(var(--muted))' },
            '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
              backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))',
              boxShadow: 'inset 2px 0 hsl(var(--primary))',
            },
            '.wql-completion-icon': { display: 'inline-flex', flexShrink: '0', color: 'hsl(var(--primary))' },
            '.cm-completionLabel': { fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' },
            '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '700', color: 'hsl(var(--primary))' },
            '.cm-completionDetail': { marginLeft: 'auto', paddingLeft: '12px', fontSize: '12px', fontStyle: 'normal', color: 'hsl(var(--muted-foreground))' },
            '@media (pointer: coarse)': { '.cm-tooltip-autocomplete > ul > li': { minHeight: '48px' } },
          }),
        ],
      }),
    });
    view.current = editor;
    if (autoFocus) editor.focus();
    return () => { editor.destroy(); view.current = undefined; };
  }, [autoFocus, placeholder]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    replacing.current = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    replacing.current = false;
  }, [value]);

  return <div ref={host} className="min-w-0 w-full rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring" data-testid="wql-text-editor" />;
}
