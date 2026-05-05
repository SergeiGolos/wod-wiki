/**
 * link-open extension
 *
 * Provides two behaviours for Markdown links in the editor:
 *
 *  1. HOVER TOOLTIP — when the mouse rests over a link a small tooltip
 *     appears showing "Ctrl+Click to open link".
 *
 *  2. CTRL+CLICK — opens the link URL in a new browser tab.
 *
 * Detection uses the Lezer Markdown syntax tree (URL / Autolink nodes) so it
 * works with `[label](url)` syntax and bare `<https://…>` autolinks.
 */

import { Extension } from "@codemirror/state";
import { EditorView, hoverTooltip, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { workbenchEventBus } from "@/services/WorkbenchEventBus";

function isNavigableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || /^(\/|\.\/|\.\.\/|#|\?)/.test(trimmed);
}

// ── URL extraction ───────────────────────────────────────────────────

/**
 * Walk the syntax tree at `pos` and return the URL string if the position
 * sits inside a `URL` node (child of `Link`) or an `Autolink` node.
 * Returns null if no link is found at that position.
 */
export function urlAtPos(view: EditorView, pos: number): string | null {
  let url: string | null = null;

  const tree = syntaxTree(view.state);
  const node = tree.resolveInner(pos, 1);

  // Walk up to find a Link or Autolink ancestor, then look for URL child
  let cursor = node;
  for (let depth = 0; depth < 6; depth++) {
    if (cursor.name === "Autolink") {
      // Autolink text includes the angle brackets — strip them
      const raw = view.state.doc.sliceString(cursor.from, cursor.to);
      url = raw.replace(/^<|>$/g, "");
      break;
    }
    if (cursor.name === "Link" || cursor.name === "Image") {
      // Find the URL child
      let child = cursor.firstChild;
      while (child) {
        if (child.name === "URL") {
          url = view.state.doc.sliceString(child.from, child.to);
          break;
        }
        child = child.nextSibling;
      }
      break;
    }
    if (!cursor.parent) break;
    cursor = cursor.parent;
  }

  return url && isNavigableUrl(url) ? url : null;
}

// ── Hover tooltip ────────────────────────────────────────────────────

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
  { hoverTime: 300 }
);

// ── Ctrl+Click handler ───────────────────────────────────────────────

const ctrlClickPlugin = ViewPlugin.fromClass(
  class {
    private handler: (e: MouseEvent) => void;
    private view: EditorView;

    constructor(view: EditorView) {
      this.view = view;
      this.handler = (e: MouseEvent) => {
        // Only fire on Ctrl or Meta (⌘ on Mac) + left-click
        if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;

        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos == null) return;

        const url = urlAtPos(view, pos);
        if (!url) return;

        e.preventDefault();
        e.stopPropagation();

        if (url.startsWith('wod:')) {
          const entryId = url.slice(4); // Remove 'wod:'
          workbenchEventBus.emitNavigateTo(entryId);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      };

      view.dom.addEventListener("mousedown", this.handler, true);
    }

    destroy() {
      this.view.dom.removeEventListener("mousedown", this.handler, true);
    }

    update(_update: ViewUpdate) {}
  }
);

// ── Cursor style on hover ────────────────────────────────────────────

const linkCursorTheme = EditorView.domEventHandlers({
  mousemove(e, view) {
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return false;
    const url = urlAtPos(view, pos);
    view.dom.style.cursor = url && (e.ctrlKey || e.metaKey) ? "pointer" : "";
    return false;
  },
  keydown(_e, view) {
    // No-op: cursor style will update on next mousemove
    view.dom.style.cursor = "";
    return false;
  },
});

// ── Public export ────────────────────────────────────────────────────

export const linkOpen: Extension = [
  linkHoverTooltip,
  ctrlClickPlugin,
  linkCursorTheme,
];
