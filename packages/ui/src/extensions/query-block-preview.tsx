import { Decoration, WidgetType, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, RangeSetBuilder, EditorState } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import React from "react";
// @ts-ignore
import { createRoot } from "react-dom/client";
import { sectionField, type EditorSection } from "./section-state";
import { QueryBlockView } from "../blocks/QueryBlockView";
import type { QueryExecutor } from "../contracts/query";
import { patchBlockQuery } from "../utils/blockQueryPatcher";

type Root = { render: (c: React.ReactNode) => void; unmount: () => void };

export interface QueryBlockPreviewOptions {
  executor?: QueryExecutor;
  onResultSaved?: (callback: () => void) => (() => void) | void;
  readOnly?: boolean;
  onSaveQuery?: (sectionId: string, nextQuery: string) => void;
}

class ReactQueryBlock extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly queryText: string,
    readonly sectionId: string,
    readonly widgetType?: string,
    readonly widgetError?: string,
    readonly options?: QueryBlockPreviewOptions,
  ) {
    super();
  }

  eq(other: ReactQueryBlock): boolean {
    return (
      this.queryText === other.queryText &&
      this.sectionId === other.sectionId &&
      this.widgetType === other.widgetType &&
      this.widgetError === other.widgetError &&
      this.options?.executor === other.options?.executor
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("div");
    container.className = "cm-query-block-preview my-2";
    const root = createRoot(container) as Root;
    this.root = root;

    const handleSaveQuery = (nextQuery: string) => {
      if (this.options?.onSaveQuery) {
        this.options.onSaveQuery(this.sectionId, nextQuery);
      } else {
        saveBlockQuerySource(view, this.sectionId, nextQuery);
      }
    };

    root.render(
      <QueryBlockView
        query={this.queryText}
        widgetType={this.widgetType}
        widgetError={this.widgetError}
        readOnly={this.options?.readOnly}
        executor={this.options?.executor}
        onResultSaved={this.options?.onResultSaved}
        onSaveQuery={handleSaveQuery}
      />,
    );

    return container;
  }

  updateDOM(_dom: HTMLElement, view: EditorView): boolean {
    if (!this.root) return false;
    const handleSaveQuery = (nextQuery: string) => {
      if (this.options?.onSaveQuery) {
        this.options.onSaveQuery(this.sectionId, nextQuery);
      } else {
        saveBlockQuerySource(view, this.sectionId, nextQuery);
      }
    };
    this.root.render(
      <QueryBlockView
        query={this.queryText}
        widgetType={this.widgetType}
        widgetError={this.widgetError}
        readOnly={this.options?.readOnly}
        executor={this.options?.executor}
        onResultSaved={this.options?.onResultSaved}
        onSaveQuery={handleSaveQuery}
      />,
    );
    return true;
  }

  destroy(): void {
    if (this.root) {
      setTimeout(() => {
        try {
          this.root?.unmount();
        } catch {
          // unmount
        }
      }, 0);
    }
  }

  get block(): boolean {
    return true;
  }
}

function buildQueryBlockDecos(state: EditorState, options?: QueryBlockPreviewOptions): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "query") continue;

    // Show raw markdown if cursor is within the block
    if (cursor >= section.from && cursor <= section.to) continue;

    if (section.contentFrom === undefined || section.contentTo === undefined) continue;
    const rawContent = state.doc.sliceString(section.contentFrom, section.contentTo);

    builder.add(
      section.from,
      section.to,
      Decoration.replace({
        widget: new ReactQueryBlock(
          rawContent,
          section.id,
          section.queryType,
          section.queryError,
          options,
        ),
        block: true,
      }),
    );
  }

  return builder.finish();
}

export function saveBlockQuerySource(
  view: EditorView,
  sectionId: string,
  newQuery: string,
  queryIndex = 0,
): { ok: boolean; patchedContent?: string; message?: string } {
  const section = findQueryBlockSection(view, sectionId);
  if (!section || section.contentFrom === undefined || section.contentTo === undefined) {
    return { ok: false, message: "Query block section not found" };
  }

  const currentContent = view.state.doc.sliceString(section.contentFrom, section.contentTo);
  const patchedContent = patchBlockQuery(currentContent, newQuery, queryIndex);

  view.dispatch({
    changes: {
      from: section.contentFrom,
      to: section.contentTo,
      insert: patchedContent,
    },
  });

  return { ok: true, patchedContent };
}

export function findQueryBlockSection(view: EditorView, sectionId: string): EditorSection | null {
  const { sections } = view.state.field(sectionField);
  return sections.find((s) => s.id === sectionId) ?? null;
}

export function queryBlockPreview(options?: QueryBlockPreviewOptions): Extension {
  const decoField = StateField.define<DecorationSet>({
    create(state) {
      return buildQueryBlockDecos(state, options);
    },
    update(deco, tr) {
      if (tr.docChanged || tr.selection) {
        return buildQueryBlockDecos(tr.state, options);
      }
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [decoField];
}
