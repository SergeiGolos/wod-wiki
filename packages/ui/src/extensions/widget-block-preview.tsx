import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import {
  StateField,
  EditorState,
  Extension,
  RangeSetBuilder,
} from "@codemirror/state";
import React from "react";
// @ts-ignore
import { createRoot } from "react-dom/client";
import { sectionField, type EditorSection } from "./section-state";

type Root = { render: (c: React.ReactNode) => void; unmount: () => void };

export interface WidgetDefinition {
  name: string;
  component: React.ComponentType<{ content: string; section: EditorSection }>;
}

export interface WidgetRegistry {
  getWidget: (name: string) => WidgetDefinition | undefined;
}

class ReactWidgetBlock extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly widgetName: string,
    readonly rawContent: string,
    readonly section: EditorSection,
    readonly registry: WidgetRegistry,
  ) {
    super();
  }

  eq(other: ReactWidgetBlock): boolean {
    return (
      this.widgetName === other.widgetName &&
      this.rawContent === other.rawContent &&
      this.section.id === other.section.id
    );
  }

  toDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "cm-widget-block-preview my-2";
    const root = createRoot(container) as Root;
    this.root = root;

    const def = this.registry.getWidget(this.widgetName);
    if (def) {
      const Component = def.component;
      root.render(<Component content={this.rawContent} section={this.section} />);
    } else {
      root.render(
        <div className="p-3 rounded border border-border bg-muted/20 text-xs font-mono text-muted-foreground">
          Widget: {this.widgetName} (not found)
        </div>,
      );
    }

    return container;
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

function buildWidgetDecos(state: EditorState, registry: WidgetRegistry): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "widget" || !section.widgetName) continue;
    if (cursor >= section.from && cursor <= section.to) continue;

    if (section.contentFrom === undefined || section.contentTo === undefined) continue;
    const rawContent = state.doc.sliceString(section.contentFrom, section.contentTo);

    builder.add(
      section.from,
      section.to,
      Decoration.replace({
        widget: new ReactWidgetBlock(section.widgetName, rawContent, section, registry),
        block: true,
      }),
    );
  }

  return builder.finish();
}

export function widgetBlockPreview(registry: WidgetRegistry): Extension {
  const decoField = StateField.define<DecorationSet>({
    create(state) {
      return buildWidgetDecos(state, registry);
    },
    update(deco, tr) {
      if (tr.docChanged || tr.selection) {
        return buildWidgetDecos(tr.state, registry);
      }
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [decoField];
}
