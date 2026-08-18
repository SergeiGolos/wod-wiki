import { Facet } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { EditorView, hoverTooltip, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";

export type NavigationHook = (url: string, view: EditorView) => void;

export const navigationFacet = Facet.define<NavigationHook, NavigationHook | null>({
  combine(values) {
    return values.length > 0 ? values[values.length - 1] : null;
  },
});

function isNavigableUrl(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

export function urlAtPos(view: EditorView, pos: number): string | null {
  const tree = syntaxTree(view.state);
  let foundUrl: string | null = null;

  tree.cursorAt(pos).iterate((node) => {
    if (node.name === "URL") {
      const text = view.state.doc.sliceString(node.from, node.to);
      if (isNavigableUrl(text)) {
        foundUrl = text;
        return false;
      }
    }
    if (node.name === "Autolink") {
      let text = view.state.doc.sliceString(node.from, node.to);
      if (text.startsWith("<") && text.endsWith(">")) {
        text = text.slice(1, -1);
      }
      if (isNavigableUrl(text)) {
        foundUrl = text;
        return false;
      }
    }
  });

  return foundUrl;
}

const linkHoverTooltip = hoverTooltip(
  (view, pos) => {
    const url = urlAtPos(view, pos);
    if (!url) return null;

    return {
      pos,
      end: pos,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className =
          "cm-link-tooltip px-2 py-1 text-[11px] text-muted-foreground bg-popover border border-border rounded shadow-sm flex items-center gap-1.5";
        dom.innerHTML =
          '<kbd class="px-1 py-0.5 rounded bg-muted border border-border/70 font-mono text-[10px]">Ctrl</kbd>' +
          '<span>+Click to open link</span>';
        return { dom };
      },
    };
  },
  { hoverTime: 300 },
);

const ctrlClickPlugin = ViewPlugin.fromClass(
  class {
    private handler: (e: MouseEvent) => void;
    private view: EditorView;

    constructor(view: EditorView) {
      this.view = view;
      this.handler = (e: MouseEvent) => {
        if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;

        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos == null) return;

        const url = urlAtPos(view, pos);
        if (!url) return;

        e.preventDefault();
        e.stopPropagation();

        const navHook = view.state.facet(navigationFacet);
        if (navHook) {
          navHook(url, view);
        } else if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      };

      view.dom.addEventListener("mousedown", this.handler, true);
    }

    destroy() {
      this.view.dom.removeEventListener("mousedown", this.handler, true);
    }

    update(_update: ViewUpdate) {}
  },
);

const linkCursorTheme = EditorView.domEventHandlers({
  mousemove(e, view) {
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return false;
    const url = urlAtPos(view, pos);
    view.dom.style.cursor = url && (e.ctrlKey || e.metaKey) ? "pointer" : "";
    return false;
  },
  keydown(_e, view) {
    view.dom.style.cursor = "";
    return false;
  },
});

export const linkOpen: Extension = [
  linkHoverTooltip,
  ctrlClickPlugin,
  linkCursorTheme,
];
