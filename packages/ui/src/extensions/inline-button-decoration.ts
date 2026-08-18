import { Decoration,
  EditorView,
  WidgetType,
  ViewPlugin,
  ViewUpdate } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";

export type ButtonAction = (action: string, params: Record<string, string>) => void;

const BUTTON_RE = /\[([^\]]+)\]\{\.button([^}]*)\}/g;

function parseAttrs(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  const attrMatches = raw.matchAll(/(\w+)=("[^"]*"|'[^']*'|\S+)/g);
  for (const m of attrMatches) {
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    params[key] = val;
  }
  return params;
}

class InlineButtonWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly params: Record<string, string>,
    readonly onAction: ButtonAction,
  ) {
    super();
  }

  eq(other: InlineButtonWidget): boolean {
    if (this.label !== other.label) return false;
    const k1 = Object.keys(this.params);
    const k2 = Object.keys(other.params);
    if (k1.length !== k2.length) return false;
    return k1.every((k) => this.params[k] === other.params[k]);
  }

  toDOM(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "cm-inline-button inline-flex items-center gap-1 px-2.5 py-0.5 my-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer select-none";
    btn.textContent = this.label;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const actionName = this.params.action || this.params.cmd || "click";
      this.onAction(actionName, this.params);
    });
    return btn;
  }
}

function buildButtonDecos(
  view: EditorView,
  onAction: ButtonAction,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    BUTTON_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BUTTON_RE.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + match[0].length;
      const label = match[1];
      const params = parseAttrs(match[2]);
      builder.add(
        start,
        end,
        Decoration.replace({
          widget: new InlineButtonWidget(label, params, onAction),
        }),
      );
    }
  }
  return builder.finish();
}

class InlineButtonPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView, readonly onAction: ButtonAction) {
    this.decorations = buildButtonDecos(view, onAction);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildButtonDecos(update.view, this.onAction);
    }
  }
}

export function inlineButtonDecoration(onAction: ButtonAction): Extension {
  return ViewPlugin.define(
    (view) => new InlineButtonPlugin(view, onAction),
    { decorations: (v) => v.decorations },
  );
}
