/**
 * Query Block Preview — CM6 extension that renders ```query fenced blocks
 * inline as live WQL results (#801, #842; widget-suffix grammar #899). Mirrors
 * widget-block-preview: each section is replaced by a non-editable block
 * decoration mounting a React root (QueryBlockView). Placing the cursor inside
 * the block reveals the raw source for editing. Includes modal inspector
 * editing via WqlComposer with patch write-back (decision #837).
 *
 * The note's frontmatter `dashboard.*` tokens are resolved once per rebuild
 * and passed to every block so `$name` references substitute at execution
 * time (#899-6). Inline editing of tokens happens in the frontmatter itself.
 */
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { Extension, StateField, Range } from "@codemirror/state";
import React from "react";
import type { EditorState } from "@codemirror/state";
// @ts-ignore
import { createRoot } from "react-dom/client";

import { sectionField, type EditorSection } from "./section-state";
import { QueryBlockView } from "../blocks/QueryBlockView";
import { patchBlockQuery } from "../utils/blockQueryPatcher";
import { parseFrontmatterBody } from "@/lib/frontmatter";
import { defaultTokenValues, extractDashboardTokens } from "@/lib/dashboard/model";

type Root = { render: (c: React.ReactNode) => void; unmount: () => void };

// ── React DOM bridge ─────────────────────────────────────────────────

class ReactQueryBlock extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly rawContent: string,
    readonly sectionId: string,
    readonly widgetType: string | undefined,
    readonly widgetError: string | undefined,
    readonly tokenValues: Record<string, string>,
  ) {
    super();
  }

  eq(other: ReactQueryBlock): boolean {
    return (
      this.rawContent === other.rawContent &&
      this.sectionId === other.sectionId &&
      this.widgetType === other.widgetType &&
      this.widgetError === other.widgetError &&
      JSON.stringify(this.tokenValues) === JSON.stringify(other.tokenValues)
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

    this.root.render(
      React.createElement(QueryBlockView, {
        query: this.rawContent,
        onSaveQuery,
        widgetType: this.widgetType,
        widgetError: this.widgetError,
        tokenValues: this.tokenValues,
      }),
    );
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

  // Resolve the note's dashboard tokens once — every query block in the note
  // shares the same frontmatter (#899-2).
  let tokenValues: Record<string, string> = {};
  const frontmatter = sections.find((s) => s.type === "frontmatter");
  if (frontmatter?.contentFrom != null && frontmatter.contentTo != null) {
    const meta = parseFrontmatterBody(
      doc.sliceString(frontmatter.contentFrom, frontmatter.contentTo),
    );
    tokenValues = defaultTokenValues(extractDashboardTokens(meta));
  }

  for (const section of sections) {
    if (section.type !== "query") continue;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;

    // Reveal source for editing when the cursor is inside the block.
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

    const rawContent =
      section.contentFrom != null && section.contentTo != null
        ? doc.sliceString(section.contentFrom, section.contentTo)
        : "";

    decos.push(
      Decoration.replace({
        widget: new ReactQueryBlock(
          rawContent,
          section.id,
          section.widgetType,
          section.widgetError,
          tokenValues,
        ),
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
 * blocks are first-class, not registry-driven.
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

/** Find a query block section by id (for tests / navigation). */
export function findQueryBlockSection(
  view: EditorView,
  sectionId: string,
): EditorSection | null {
  const { sections } = view.state.field(sectionField);
  return sections.find((s) => s.type === "query" && s.id === sectionId) ?? null;
}

/**
 * Patch a composed WQL query back into the source of a ```query section.
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
