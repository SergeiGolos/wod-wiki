/**
 * Inline Button Decoration
 *
 * CM6 extension that replaces inline button syntax with clickable button elements.
 *
 * Syntax:
 *   [Label]{.button route=/tracker}
 *   [Start Workout]{.button action=start-workout}
 *   [Share Result]{.button action=emit name=result-shared}
 *
 * Supported attributes (space-separated key=value pairs after .button):
 *   route=<path>       — call onButtonAction("route", { route })
 *   action=<name>      — call onButtonAction(name, {})
 *   name=<event-name>  — additional param passed with action=emit
 *   variant=primary|secondary|ghost   — visual variant (default: "primary")
 *
 * The host passes `onButtonAction(action, params)` to handle navigation,
 * workout starts, or custom events.
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Extension, Range } from "@codemirror/state";

// ── Types ─────────────────────────────────────────────────────────────

export type ButtonAction = (action: string, params: Record<string, string>) => void;

// ── Pattern ───────────────────────────────────────────────────────────

/**
 * Matches: [Label]{.button key=val key=val}
 * Groups: 1=label, 2=attribute string
 */
const BUTTON_RE = /\[([^\]]+)\]\{\.button([^}]*)\}/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match key=value or key="value with spaces"
  const attrRe = /([\w-]+)=(?:"([^"]*)"|([\S]*))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(raw)) !== null) {
    attrs[m[1]] = m[2] ?? m[3] ?? "";
  }
  return attrs;
}

// ── Widget ────────────────────────────────────────────────────────────

class InlineButtonWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly attrs: Record<string, string>,
    readonly onAction: ButtonAction,
  ) {
    super();
  }

  eq(other: InlineButtonWidget): boolean {
    return (
      this.label === other.label &&
      JSON.stringify(this.attrs) === JSON.stringify(other.attrs)
    );
  }

  toDOM(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = this.label;

    const variant = this.attrs["variant"] ?? "primary";

    // Base styles — uses CSS custom properties so they adapt to light/dark themes
    btn.style.cssText = [
      "display: inline-flex",
      "align-items: center",
      "gap: 4px",
      "padding: 4px 14px",
      "border-radius: 6px",
      "font-size: 13px",
      "font-weight: 600",
      "line-height: 1.5",
      "cursor: pointer",
      "border: 1px solid transparent",
      "vertical-align: middle",
      "transition: opacity 0.15s, background 0.15s",
      "outline-offset: 2px",
    ].join(";");

    if (variant === "secondary") {
      btn.style.background = "transparent";
      btn.style.borderColor = "var(--border, #52525b)";
      btn.style.color = "var(--foreground, #e4e4e7)";
    } else if (variant === "ghost") {
      btn.style.background = "transparent";
      btn.style.color = "var(--primary, #18e299)";
      btn.style.textDecoration = "underline";
    } else {
      // primary
      btn.style.background = "var(--primary, #18e299)";
      btn.style.color = "var(--primary-foreground, #0a0a0a)";
    }

    const attrs = this.attrs;
    const onAction = this.onAction;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (attrs["route"]) {
        onAction("route", { route: attrs["route"] });
      } else if (attrs["action"]) {
        const params: Record<string, string> = {};
        Object.entries(attrs).forEach(([k, v]) => {
          if (k !== "action" && k !== "variant") params[k] = v;
        });
        onAction(attrs["action"], params);
      }
    });

    // Hover effect via mouseenter/mouseleave
    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "0.85";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "1";
    });

    return btn;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// ── Builder ───────────────────────────────────────────────────────────

function buildButtonDecos(
  view: EditorView,
  onAction: ButtonAction,
): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const cursorHead = view.state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    BUTTON_RE.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = BUTTON_RE.exec(text)) !== null) {
      const matchFrom = from + m.index;
      const matchTo = matchFrom + m[0].length;

      // If cursor is inside the match, show raw text for editing
      if (cursorHead >= matchFrom && cursorHead <= matchTo) continue;

      const label = m[1];
      const attrs = parseAttrs(m[2]);

      decos.push(
        Decoration.replace({
          widget: new InlineButtonWidget(label, attrs, onAction),
          inclusive: false,
        }).range(matchFrom, matchTo),
      );
    }
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── ViewPlugin ────────────────────────────────────────────────────────

class InlineButtonPlugin {
  decorations: DecorationSet;

  constructor(
    view: EditorView,
    readonly onAction: ButtonAction,
  ) {
    this.decorations = buildButtonDecos(view, onAction);
  }

  update(update: ViewUpdate): void {
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged
    ) {
      this.decorations = buildButtonDecos(update.view, this.onAction);
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────

/**
 * Create an inline-button decoration extension.
 * Pass a callback that handles button actions; re-create when the callback changes.
 */
export function inlineButtonDecoration(onAction: ButtonAction): Extension {
  const plugin = ViewPlugin.define(
    (view) => new InlineButtonPlugin(view, onAction),
    { decorations: (v) => v.decorations },
  );
  return plugin;
}
