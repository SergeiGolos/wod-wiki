/**
 * WqlQueryField — single-line CodeMirror field for WQL queries
 * (`agg:metric{filters} by {dims} .rollup(period)`), with syntax highlighting
 * and autocomplete over the analytics dictionary (src/parser/wql-language.ts).
 *
 * Placement on the analytics surface is ticket #729's call; this component is
 * the mountable field the Explorer/Dashboard widgets (#732/#733) consume.
 */

import React, { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { wql, type WqlCompletionOptions } from "@/parser/wql-language";
import { cn } from "@/lib/utils";

export interface WqlQueryFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired on Enter with the current query. */
  onSubmit?: (value: string) => void;
  /**
   * Effort slugs for `{effort:…}` / `<effortSlug>.<family>` completion —
   * feed from the EffortResolver: `() => resolver.list().map(e => e.slug)`.
   */
  effortNames?: WqlCompletionOptions["effortNames"];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const WqlQueryField: React.FC<WqlQueryFieldProps> = ({
  value,
  onChange,
  onSubmit,
  effortNames,
  placeholder,
  autoFocus,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Latest-callback refs so the editor is created once and never rebuilt.
  const callbacksRef = useRef({ onChange, onSubmit });
  callbacksRef.current = { onChange, onSubmit };

  useEffect(() => {
    if (!containerRef.current) return;

    const singleLine: Extension = EditorState.transactionFilter.of((tr) => {
      let blocked = false;
      tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
        if (inserted.toString().includes("\n")) blocked = true;
      });
      return blocked ? [] : tr;
    });

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          singleLine,
          history(),
          keymap.of([
            {
              key: "Enter",
              run: (v) => {
                callbacksRef.current.onSubmit?.(v.state.doc.toString());
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          wql({ effortNames }),
          cmPlaceholder(placeholder ?? "sum:totalVolume{discipline:strength} by {week}.rollup(1w)"),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              callbacksRef.current.onChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { fontSize: "13px" },
            ".cm-content": { padding: "6px 8px" },
            ".cm-line": { padding: "0" },
            "&.cm-focused": { outline: "none" },
          }),
        ],
      }),
    });
    viewRef.current = view;
    if (autoFocus) view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Created once; value is pulled in by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (e.g. example-query chips) sync into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-md border border-input bg-background text-foreground",
        "focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    />
  );
};
