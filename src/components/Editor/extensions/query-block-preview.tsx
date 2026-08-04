/**
 * Query Block Preview — CM6 extension that renders ```query and ```dashboard
 * fenced blocks inline as live WQL results (#801, #842). Mirrors widget-block-preview:
 * each section is replaced by a non-editable block decoration mounting a React
 * root (QueryBlockView / DashboardBlockView). Placing the cursor inside the
 * block reveals the raw source for editing. Includes modal inspector editing via
 * WqlComposer with patch write-back (decision #837).
 */
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { Extension, StateField, Range } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
// @ts-ignore
import { createRoot } from "react-dom/client";
import React from "react";

import { sectionField } from "./section-state";
import type { EditorSection } from "./section-state";
import { QueryBlockView } from "../blocks/QueryBlockView";
import { DashboardBlockView } from "../blocks/DashboardBlockView";
import { patchBlockQuery } from "../utils/blockQueryPatcher";

type Root = { render: (c: React.ReactNode) => void; unmount: () => void };

// ── React DOM bridge ─────────────────────────────────────────────────

class ReactQueryBlock extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly kind: "query" | "dashboard",
    readonly rawContent: string,
    readonly sectionId: string,
  ) {
    super();
  }

  eq(other: ReactQueryBlock): boolean {
    return (
      this.kind === other.kind &&
      this.rawContent === other.rawContent &&
      this.sectionId === other.sectionId
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-query-block-preview";
    wrapper.style.cssText =
      "display:block; width:100%; min-height:1.5em; outline:none;";

    this.root = createRoot(wrapper) as unknown as Root;
    const onSaveQuery = (newQuery: string, queryIndex = 0) => {
      saveBlockQuerySource(view, this.sectionId, newQuery, queryIndex);
    };

    if (this.kind === "query") {
      this.root.render(
        React.createElement(QueryBlockView, {
          query: this.rawContent,
          onSaveQuery,
        }),
      );
    } else {
      this.root.render(
        React.createElement(DashboardBlockView, {
          body: this.rawContent,
          onSaveQuery,
        }),
      );
    }
    return wrapper;
  }

  destroy(): void {
    if (!this.root) return;
    const r = this.root;
    this.root = null;
    const isTestEnv =
      typeof process !== "undefined" && process.env?.NODE_ENV === "test";
    if (isTestEnv) {
      r.unmount();
    } else {
      queueMicrotask(() => {
        try {
          r.unmount();
        } catch {
          /* already unmounted */
        }
      });
    }
  }

  ignoreEvent(): boolean {
    return false;
  }

  get estimatedHeight(): number {
    return 200;
  }
}

// ── Decoration builder ───────────────────────────────────────────────

function buildQueryBlockDecos(state: EditorState): DecorationSet {
  let sectionState;
  try {
    sectionState = state.field(sectionField);
  } catch {
    return Decoration.none;
  }
  const { sections } = sectionState;
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;
  const doc = state.doc;

  for (const section of sections) {
    if (section.type !== "query" && section.type !== "dashboard") continue;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;

    // Reveal source for editing when the cursor is inside the block.
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

    const rawContent =
      section.contentFrom != null && section.contentTo != null
        ? doc.sliceString(section.contentFrom, section.contentTo)
        : "";

    decos.push(
      Decoration.replace({
        widget: new ReactQueryBlock(section.type, rawContent, section.id),
        block: true,
      }).range(section.from, section.to),
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── Extension ────────────────────────────────────────────────────────

/**
 * Mount as an editor extension alongside sectionField. Always enabled — query
 * and dashboard blocks are first-class, not registry-driven.
 */
export function queryBlockPreview(): Extension {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildQueryBlockDecos(state);
    },
    update(decos, tr) {
      if (!tr.docChanged && !tr.selection && !tr.effects.length) return decos;
      return buildQueryBlockDecos(tr.state);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

/** Find a query/dashboard block section by id (for tests / navigation). */
export function findQueryBlockSection(
  view: EditorView,
  sectionId: string,
): EditorSection | null {
  const { sections } = view.state.field(sectionField);
  return (
    sections.find(
      (s) => (s.type === "query" || s.type === "dashboard") && s.id === sectionId,
    ) ?? null
  );
}

/**
 * Patch a composed WQL query back into the source of a ```query or ```dashboard section.
 */
export function saveBlockQuerySource(
  view: EditorView,
  sectionId: string,
  newQuery: string,
  queryIndex = 0,
): { ok: boolean; patchedContent?: string; message?: string } {
  const section = findQueryBlockSection(view, sectionId);
  if (!section || section.contentFrom == null || section.contentTo == null) {
    return {
      ok: false,
      message: "Unable to locate query block section in editor.",
    };
  }

  const currentContent = view.state.doc.sliceString(
    section.contentFrom,
    section.contentTo,
  );
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
