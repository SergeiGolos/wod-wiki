/**
 * Link Preview
 *
 * Replaces URLs in markdown note text with a visual link pill (outline +
 * external-open button):
 *  - markdown links `[label](https://…)`
 *  - bare URLs `https://…`
 *
 * Standalone `[label](url)` lines, bare-URL lines, and list items holding only
 * a link get the same pill treatment; a YouTube URL on such a line renders as
 * an inline player whenever the cursor is elsewhere, reverting to raw text
 * when the cursor moves onto the line.
 */

import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, EditorState, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { sectionField } from "./section-state";

const MD_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_URL_RE = /https?:\/\/\S+/g;
const CODE_SPAN_RE = /`[^`\n]*`/g;
// Trailing punctuation is not part of the URL when a bare link ends a sentence.
const TRAILING_PUNCT_RE = /[.,;:!?)\]}>'"]$/;

// ponytail: third local copy (playground lib + wql dashboard have others);
// promote to @bitcobblers/wod-wiki-core when one more package needs it.
function extractYouTubeVideoId(url: string): string | null {
  const standard = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (standard) return standard[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return short[1];
  const embed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

function createExternalIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "h-3 w-3");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M15 3h6v6");
  svg.appendChild(path);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", "10");
  line.setAttribute("x2", "21");
  line.setAttribute("y1", "14");
  line.setAttribute("y2", "3");
  svg.appendChild(line);

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", "21 14 21 3 10 3");
  svg.appendChild(polyline);

  return svg;
}

/** Inline pill: outlined link with an external-open (new tab) button. */
class LinkPillWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly url: string,
  ) {
    super();
  }

  eq(other: LinkPillWidget): boolean {
    return this.label === other.label && this.url === other.url;
  }

  toDOM(): HTMLElement {
    const pill = document.createElement("span");
    pill.className = "cm-link-pill";

    const label = document.createElement("span");
    label.className = "cm-link-pill-label";
    label.textContent = this.label || this.url;
    pill.appendChild(label);

    const open = document.createElement("a");
    open.className = "cm-link-pill-open";
    open.href = this.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.title = this.url;
    open.setAttribute("aria-label", `Open ${this.label || this.url} in new tab`);
    open.appendChild(createExternalIcon());
    pill.appendChild(open);

    return pill;
  }
}

/** Block-level YouTube player shown in read-only mode. */
class YouTubePlayerWidget extends WidgetType {
  constructor(
    readonly videoId: string,
    readonly title: string,
  ) {
    super();
  }

  eq(other: YouTubePlayerWidget): boolean {
    return this.videoId === other.videoId && this.title === other.title;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-youtube-player";

    const iframe = document.createElement("iframe");
    iframe.className = "cm-youtube-player-frame";
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}`;
    iframe.title = this.title || "YouTube video";
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("loading", "lazy");
    wrap.appendChild(iframe);

    return wrap;
  }

  get block(): boolean {
    return true;
  }
}

interface LinkMatch {
  from: number;
  to: number;
  label: string;
  url: string;
}

function findLineLinks(line: { from: number; text: string }): LinkMatch[] {
  const links: LinkMatch[] = [];
  const codeSpans: [number, number][] = [];

  let match: RegExpExecArray | null;
  CODE_SPAN_RE.lastIndex = 0;
  while ((match = CODE_SPAN_RE.exec(line.text)) !== null) {
    codeSpans.push([match.index, match.index + match[0].length]);
  }
  const inCodeSpan = (index: number) => codeSpans.some(([a, b]) => index >= a && index < b);

  MD_LINK_RE.lastIndex = 0;
  while ((match = MD_LINK_RE.exec(line.text)) !== null) {
    if (inCodeSpan(match.index)) continue;
    links.push({
      from: line.from + match.index,
      to: line.from + match.index + match[0].length,
      label: match[1],
      url: match[2],
    });
  }

  BARE_URL_RE.lastIndex = 0;
  while ((match = BARE_URL_RE.exec(line.text)) !== null) {
    if (inCodeSpan(match.index)) continue;
    const found = match;
    // Skip URLs already consumed by a markdown-link match on the same line.
    if (links.some((l) => found.index >= l.from - line.from && found.index < l.to - line.from)) continue;
    let url = found[0];
    while (TRAILING_PUNCT_RE.test(url)) url = url.slice(0, -1);
    if (!url) continue;
    links.push({
      from: line.from + found.index,
      to: line.from + found.index + url.length,
      label: url,
      url,
    });
  }

  return links.sort((a, b) => a.from - b.from);
}

function buildLinkDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;
  const readOnly = state.readOnly;

  for (const section of sections) {
    if (section.type !== "markdown" && section.type !== "embed") continue;
    if (section.type === "markdown" && section.subtype === "table") continue;

    for (let l = section.startLine; l <= section.endLine; l++) {
      const line = state.doc.line(l);
      // Table lines are rendered by markdownTablePreview; pills would
      // overlap its whole-block replace decoration.
      if (line.text.trim().startsWith("|")) continue;
      // While editing, keep the raw markdown on the cursor's own line so the
      // link text stays editable (same convention as markdownSyntaxHiding).
      if (!readOnly && cursor >= line.from && cursor <= line.to) continue;

      const links = findLineLinks(line);
      const trimmed = line.text.trimStart();
      const leading = line.text.length - trimmed.length;
      const trailing = line.text.length - line.text.trimEnd().length;
      // `- url` / `* url` / `+ url` items whose content is only the link count
      // as standalone; the player replaces the whole line incl. the marker.
      const bodyStart = leading + (trimmed.match(/^[-*+]\s+/)?.[0].length ?? 0);

      for (const link of links) {
        // A standalone link line (bare URL, markdown link, or list item holding
        // only the link) becomes a YouTube player when the cursor is elsewhere;
        // the cursor's own line stays raw/editable (skip above).
        const wholeLine =
          links.length === 1 &&
          link.from === line.from + bodyStart &&
          link.to === line.to - trailing;
        const videoId = wholeLine ? extractYouTubeVideoId(link.url) : null;

        if (videoId) {
          builder.add(
            line.from,
            line.to,
            Decoration.replace({ widget: new YouTubePlayerWidget(videoId, link.label), block: true }),
          );
        } else {
          builder.add(
            link.from,
            link.to,
            Decoration.replace({ widget: new LinkPillWidget(link.label, link.url) }),
          );
        }
      }
    }
  }

  return builder.finish();
}

const linkPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildLinkDecos(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLinkDecos(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const linkPreviewTheme = EditorView.baseTheme({
  ".cm-link-pill": {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "0 5px",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
    backgroundColor: "hsl(var(--muted) / 0.35)",
    maxWidth: "100%",
  },
  ".cm-link-pill-label": {
    color: "hsl(var(--primary))",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ".cm-link-pill-open": {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: "0",
    color: "hsl(var(--muted-foreground))",
    textDecoration: "none",
    cursor: "pointer",
  },
  ".cm-link-pill-open:hover": {
    color: "hsl(var(--primary))",
  },
  ".cm-youtube-player": {
    width: "100%",
    aspectRatio: "16 / 9",
    margin: "8px 0",
    backgroundColor: "#000",
    borderRadius: "6px",
    overflow: "hidden",
  },
  ".cm-youtube-player-frame": {
    display: "block",
    width: "100%",
    height: "100%",
    border: "none",
  },
});

export const linkPreview: Extension = [linkPreviewField, linkPreviewTheme];
