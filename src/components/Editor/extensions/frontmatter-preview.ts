/**
 * Frontmatter Preview Decorations
 *
 * Replaces frontmatter sections (--- delimited YAML) with rich preview
 * widgets when the cursor is NOT inside them. Supports:
 *   - YouTube: embedded video player (youtube-nocookie.com)
 *   - Amazon: product card with image, price, description
 *
 * When the cursor enters a frontmatter section, the widget collapses
 * back to raw YAML so the user can edit. This mimics the "preview mode"
 * pattern used by WOD block decorations.
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { EditorState, Range, StateField, Extension, Prec } from "@codemirror/state";
import { sectionField, EditorSection } from "./section-state";

// ── Frontmatter parsing helpers ─────────────────────────────────────

type FrontmatterSubtype = "youtube" | "amazon" | "strava" | "default";

function parseFrontmatterProps(
  state: EditorState,
  section: EditorSection
): Record<string, string> {
  const props: Record<string, string> = {};
  const doc = state.doc;
  for (let ln = section.startLine + 1; ln < section.endLine; ln++) {
    const line = doc.line(ln).text;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

function detectSubtype(props: Record<string, string>): FrontmatterSubtype {
  const typeValue = (props["type"] || "").toLowerCase();
  if (typeValue === "youtube") return "youtube";
  if (typeValue === "amazon") return "amazon";
  if (typeValue === "strava") return "strava";

  const url = props["url"] || props["link"] || "";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/amazon\.com|amzn\.to/i.test(url)) return "amazon";
  if (/strava\.com/i.test(url)) return "strava";

  return "default";
}

// ── YouTube video ID extraction ─────────────────────────────────────

function extractYouTubeVideoId(url: string): string | null {
  const standard = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (standard) return standard[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const embed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

// ── YouTube Preview Widget ──────────────────────────────────────────

class YouTubePreviewWidget extends WidgetType {
  constructor(
    readonly videoId: string,
    readonly title: string,
    readonly sectionFrom: number,
  ) {
    super();
  }

  eq(other: YouTubePreviewWidget): boolean {
    return this.videoId === other.videoId && this.sectionFrom === other.sectionFrom;
  }

  toDOM(_view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-youtube-preview";

    // Container with 16:9 aspect ratio
    const container = document.createElement("div");
    container.className = "cm-youtube-container";

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}`;
    iframe.title = this.title;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    container.appendChild(iframe);
    wrapper.appendChild(container);

    // Title below if non-default
    if (this.title !== "YouTube Video") {
      const label = document.createElement("div");
      label.className = "cm-youtube-title";
      label.textContent = this.title;
      wrapper.appendChild(label);
    }

    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// ── Amazon Product Widget ───────────────────────────────────────────

class AmazonPreviewWidget extends WidgetType {
  constructor(
    readonly props: Record<string, string>,
    readonly sectionFrom: number,
  ) {
    super();
  }

  eq(other: AmazonPreviewWidget): boolean {
    return (
      this.props["url"] === other.props["url"] &&
      this.props["title"] === other.props["title"] &&
      this.sectionFrom === other.sectionFrom
    );
  }

  toDOM(_view: EditorView): HTMLElement {
    const url = this.props["url"] || this.props["link"] || "";
    const title = this.props["title"] || "Amazon Product";
    const description = this.props["description"] || "";
    const image = this.props["image"] || this.props["img"] || "";
    const price = this.props["price"] || "";
    const salePrice = this.props["sale_price"] || this.props["sale"] || "";

    const wrapper = document.createElement("div");
    wrapper.className = "cm-amazon-preview";

    if (!url) {
      const empty = document.createElement("div");
      empty.className = "cm-amazon-empty";
      empty.textContent = "No Amazon product URL provided";
      wrapper.appendChild(empty);
      return wrapper;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "cm-amazon-link";

    const card = document.createElement("div");
    card.className = "cm-amazon-card";

    // Product image
    if (image) {
      const imgContainer = document.createElement("div");
      imgContainer.className = "cm-amazon-image";
      const img = document.createElement("img");
      img.src = image;
      img.alt = title;
      img.loading = "lazy";
      imgContainer.appendChild(img);
      card.appendChild(imgContainer);
    }

    // Product info
    const info = document.createElement("div");
    info.className = "cm-amazon-info";

    // Title row
    const titleRow = document.createElement("div");
    titleRow.className = "cm-amazon-title-row";
    const titleEl = document.createElement("span");
    titleEl.className = "cm-amazon-title";
    titleEl.textContent = title;
    titleRow.appendChild(titleEl);

    const cartIcon = document.createElement("span");
    cartIcon.className = "cm-amazon-cart-icon";
    cartIcon.textContent = "🛒";
    titleRow.appendChild(cartIcon);
    info.appendChild(titleRow);

    // Description
    if (description) {
      const desc = document.createElement("p");
      desc.className = "cm-amazon-desc";
      desc.textContent = description;
      info.appendChild(desc);
    }

    // Price row
    const priceRow = document.createElement("div");
    priceRow.className = "cm-amazon-price-row";

    if (salePrice) {
      const salePriceEl = document.createElement("span");
      salePriceEl.className = "cm-amazon-sale-price";
      salePriceEl.textContent = salePrice;
      priceRow.appendChild(salePriceEl);

      if (price) {
        const origPrice = document.createElement("span");
        origPrice.className = "cm-amazon-orig-price";
        origPrice.textContent = price;
        priceRow.appendChild(origPrice);
      }

      const dealBadge = document.createElement("span");
      dealBadge.className = "cm-amazon-deal-badge";
      dealBadge.textContent = "🏷️ Deal";
      priceRow.appendChild(dealBadge);
    } else if (price) {
      const priceEl = document.createElement("span");
      priceEl.className = "cm-amazon-price";
      priceEl.textContent = price;
      priceRow.appendChild(priceEl);
    }

    const buyLink = document.createElement("span");
    buyLink.className = "cm-amazon-buy";
    buyLink.textContent = "Buy on Amazon →";
    priceRow.appendChild(buyLink);

    info.appendChild(priceRow);
    card.appendChild(info);
    link.appendChild(card);
    wrapper.appendChild(link);

    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// ── Build replace decorations for frontmatter sections ──────────────

function buildFrontmatterDecos(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "frontmatter") continue;

    // Don't replace when cursor is inside this section (let user edit)
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

    const props = parseFrontmatterProps(state, section);
    const subtype = detectSubtype(props);

    if (subtype === "youtube") {
      const url = props["url"] || props["link"] || "";
      const title = props["title"] || "YouTube Video";
      const videoId = extractYouTubeVideoId(url);

      if (videoId) {
        decos.push(
          Decoration.replace({
            widget: new YouTubePreviewWidget(
              videoId,
              title,
              section.from,
            ),
            block: true,
          }).range(section.from, section.to)
        );
      }
    } else if (subtype === "amazon") {
      decos.push(
        Decoration.replace({
          widget: new AmazonPreviewWidget(
            props,
            section.from,
          ),
          block: true,
        }).range(section.from, section.to)
      );
    }
    // strava and default: no preview widget (could be added later)
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ──────────────────────────────────────────────────────

const frontmatterPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildFrontmatterDecos(state);
  },
  update(value, tr) {
    // Rebuild on doc change or cursor movement (cursor toggles preview)
    if (tr.docChanged || tr.selection) {
      return buildFrontmatterDecos(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Base theme ──────────────────────────────────────────────────────

const frontmatterPreviewTheme = EditorView.baseTheme({
  // ── YouTube ─────────────────────────────────────────────────────
  ".cm-youtube-preview": {
    padding: "4px 0",
    maxWidth: "560px",
  },
  ".cm-youtube-container": {
    position: "relative",
    width: "100%",
    paddingBottom: "56.25%", // 16:9 aspect ratio
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(128,128,128,0.2)",
    backgroundColor: "#000",
  },
  ".cm-youtube-container iframe": {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    border: "none",
  },
  ".cm-youtube-title": {
    marginTop: "4px",
    fontSize: "12px",
    color: "var(--cm-muted-foreground, #888)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // ── Amazon ──────────────────────────────────────────────────────
  ".cm-amazon-preview": {
    padding: "8px 0",
    maxWidth: "560px",
  },
  ".cm-amazon-empty": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontStyle: "italic",
    color: "var(--cm-muted-foreground, #888)",
    padding: "16px",
    backgroundColor: "rgba(128,128,128,0.05)",
    borderRadius: "8px",
  },
  ".cm-amazon-link": {
    display: "block",
    textDecoration: "none",
    color: "inherit",
  },
  ".cm-amazon-card": {
    display: "flex",
    borderRadius: "8px",
    border: "1px solid rgba(128,128,128,0.2)",
    overflow: "hidden",
    backgroundColor: "var(--cm-card-bg, #fff)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  ".cm-amazon-card:hover": {
    borderColor: "rgba(255, 153, 0, 0.5)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  ".cm-amazon-image": {
    width: "140px",
    minHeight: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
    backgroundColor: "#fff",
    borderRight: "1px solid rgba(128,128,128,0.1)",
    flexShrink: "0",
  },
  ".cm-amazon-image img": {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    transition: "transform 0.3s",
  },
  ".cm-amazon-card:hover .cm-amazon-image img": {
    transform: "scale(1.05)",
  },
  ".cm-amazon-info": {
    flex: "1",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minWidth: "0",
  },
  ".cm-amazon-title-row": {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "4px",
  },
  ".cm-amazon-title": {
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "1.3",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    transition: "color 0.2s",
  },
  ".cm-amazon-card:hover .cm-amazon-title": {
    color: "#c45500",
  },
  ".cm-amazon-cart-icon": {
    fontSize: "16px",
    flexShrink: "0",
    opacity: "0.6",
  },
  ".cm-amazon-desc": {
    fontSize: "11px",
    color: "var(--cm-muted-foreground, #888)",
    lineHeight: "1.4",
    marginBottom: "8px",
    display: "-webkit-box",
    WebkitLineClamp: "3",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  ".cm-amazon-price-row": {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "8px",
    marginTop: "auto",
  },
  ".cm-amazon-sale-price": {
    fontSize: "16px",
    fontWeight: "700",
    color: "#B12704",
  },
  ".cm-amazon-orig-price": {
    fontSize: "12px",
    textDecoration: "line-through",
    opacity: "0.5",
    marginLeft: "6px",
  },
  ".cm-amazon-deal-badge": {
    fontSize: "10px",
    fontWeight: "700",
    color: "#B12704",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  ".cm-amazon-price": {
    fontSize: "16px",
    fontWeight: "700",
  },
  ".cm-amazon-buy": {
    fontSize: "12px",
    fontWeight: "600",
    color: "#c45500",
    transition: "transform 0.2s",
    marginLeft: "auto",
    flexShrink: "0",
  },
  ".cm-amazon-card:hover .cm-amazon-buy": {
    transform: "translateX(2px)",
  },

  // ── Dark mode ───────────────────────────────────────────────────
  "&dark .cm-amazon-card": {
    backgroundColor: "var(--cm-card-bg, #1e1e1e)",
  },
  "&dark .cm-amazon-image": {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  "&dark .cm-amazon-title": {
    color: "var(--cm-foreground, #e0e0e0)",
  },
  "&dark .cm-amazon-card:hover .cm-amazon-title": {
    color: "#FF9900",
  },
  "&dark .cm-amazon-buy": {
    color: "#FF9900",
  },
});

// ── Keymap: navigate INTO frontmatter previews with arrow keys ───────
//
// Same pattern as markdown-tables.ts — Decoration.replace makes replaced
// ranges atomic and invisible to arrow-key navigation. Move cursor inside
// the range to collapse the preview and reveal the raw YAML.

function enterFrontmatterDown(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const curLineNum = view.state.doc.lineAt(head).number;
  const nextLineNum = curLineNum + 1;
  if (nextLineNum > view.state.doc.lines) return false;

  const nextLine = view.state.doc.line(nextLineNum);
  const decos = view.state.field(frontmatterPreviewField);
  let targetFrom: number | null = null;

  decos.between(nextLine.from, nextLine.from, (from) => {
    targetFrom = from;
    return false;
  });

  if (targetFrom === null) return false;

  view.dispatch({
    selection: { anchor: targetFrom, head: targetFrom },
    scrollIntoView: true,
  });
  return true;
}

function enterFrontmatterUp(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const curLineNum = view.state.doc.lineAt(head).number;
  const prevLineNum = curLineNum - 1;
  if (prevLineNum < 1) return false;

  const prevLine = view.state.doc.line(prevLineNum);
  const decos = view.state.field(frontmatterPreviewField);
  let targetTo: number | null = null;

  decos.between(prevLine.from, prevLine.to, (_, to) => {
    targetTo = to;
    return false;
  });

  if (targetTo === null) return false;

  const lastLineFrom = view.state.doc.lineAt(
    Math.max(targetTo - 1, 0)
  ).from;
  view.dispatch({
    selection: { anchor: lastLineFrom, head: lastLineFrom },
    scrollIntoView: true,
  });
  return true;
}

const frontmatterNavKeymap = Prec.high(keymap.of([
  { key: "ArrowDown", run: enterFrontmatterDown },
  { key: "ArrowUp", run: enterFrontmatterUp },
]));

// ── Public export ───────────────────────────────────────────────────

/**
 * Extension: replaces frontmatter sections with rich preview widgets
 * (YouTube embed, Amazon product card) when the cursor is outside them.
 */
export const frontmatterPreview: Extension = [
  frontmatterPreviewField,
  frontmatterNavKeymap,
  frontmatterPreviewTheme,
];
