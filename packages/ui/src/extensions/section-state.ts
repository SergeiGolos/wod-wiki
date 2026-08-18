import { StateField, StateEffect, EditorState } from "@codemirror/state";
import { parseQueryWidgetSuffix } from "@wod-wiki/engine";
import { hashCode } from "../utils/cn";

export type EditorDialect = "time" | "log";
const VALID_DIALECTS: EditorDialect[] = ["time", "log"];

interface DialectFenceMatch {
  dialect: EditorDialect;
  sport?: string;
}

export type EditorSectionType = "markdown" | "time" | "log" | "frontmatter" | "code" | "widget" | "embed" | "query";

export type EditorSectionSubtype =
  | "heading"
  | "paragraph"
  | "list"
  | "blockquote"
  | "table"
  | "unknown";

export type EmbedType = "image" | "link" | "youtube";

export interface EditorSection {
  id: string;
  type: EditorSectionType;
  subtype?: EditorSectionSubtype;
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  contentFrom?: number;
  contentTo?: number;
  sport?: string;
  widgetName?: string;
  contentId?: string;
  queryType?: string;
  queryError?: string;
  embed?: {
    type: EmbedType;
    url: string;
    label: string;
    videoId?: string;
    height?: number;
  };
}

export interface SectionState {
  sections: EditorSection[];
}

export const forceSectionParse = StateEffect.define<null>();

export function blockContentId(content: string): string {
  const normalized = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
  return `wblk-${hashCode(normalized).toString(36)}`;
}

function generateSectionId(type: string, startLine: number, content: string): string {
  return `${type}-${startLine}-${hashCode(content).toString(36)}`;
}

function mapIdentities(
  oldSections: EditorSection[],
  newSections: EditorSection[],
): EditorSection[] {
  return newSections.map((nSec) => {
    const match = oldSections.find(
      (oSec) => oSec.type === nSec.type && Math.abs(oSec.startLine - nSec.startLine) <= 2,
    );
    return match ? { ...nSec, id: match.id } : nSec;
  });
}

function matchDialectFence(trimmed: string): DialectFenceMatch | null {
  const match = trimmed.match(/^```\s*(\w+)(?::(\w+))?\s*$/);
  if (!match) return null;
  const tag = match[1].toLowerCase() as EditorDialect;
  if (!VALID_DIALECTS.includes(tag)) return null;
  return { dialect: tag, sport: match[2]?.toLowerCase() };
}

function matchWidgetFence(trimmed: string): string | null {
  const match = trimmed.match(/^```\s*widget:([\w-]+)\s*$/);
  return match ? match[1] : null;
}

interface ContentFenceMatch {
  kind: 'query';
  widgetType?: string;
  widgetError?: string;
}

function matchContentFence(trimmed: string): ContentFenceMatch | null {
  const match = trimmed.match(/^```\s*query(\S*)\s*$/i);
  if (!match) return null;
  const suffix = match[1] ?? '';
  const parsed = parseQueryWidgetSuffix(suffix);
  return {
    kind: 'query',
    widgetType: parsed.type,
    widgetError: parsed.error,
  };
}

function matchGenericFence(trimmed: string): string | null {
  const match = trimmed.match(/^```\s*(\S+)\s*$/);
  if (!match) return null;
  const tag = match[1].toLowerCase();
  if (VALID_DIALECTS.includes(tag as EditorDialect)) return null;
  if (tag.startsWith("widget:")) return null;
  if (tag.startsWith("query")) return null;
  return match[1];
}

function matchMarkdownEmbed(trimmed: string): EditorSection['embed'] | null {
  const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imgMatch) {
    const label = imgMatch[1];
    const url = imgMatch[2];
    return { type: "image", url, label };
  }
  const linkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (linkMatch) {
    const label = linkMatch[1];
    const url = linkMatch[2];
    return { type: "link", url, label };
  }
  return null;
}

function detectMarkdownSubtype(lines: string[]): EditorSectionSubtype {
  const first = lines.find((l) => l.trim().length > 0)?.trim() ?? "";
  if (/^#{1,6}\s/.test(first)) return "heading";
  if (/^[-*+]\s|^\d+\.\s/.test(first)) return "list";
  if (/^>\s?/.test(first)) return "blockquote";
  if (first.startsWith("|") && lines.some((l) => /^\|[\s:]*-+/.test(l.trim()))) return "table";
  return "paragraph";
}

function scanFenced(state: EditorState, openLineNum: number): {
  closeLine: number; contentFrom: number; contentTo: number;
} {
  const openLine = state.doc.line(openLineNum);
  const contentFrom = openLine.to + 1;
  for (let i = openLineNum + 1; i <= state.doc.lines; i++) {
    const l = state.doc.line(i);
    if (l.text.trim().startsWith("```")) {
      return { closeLine: i, contentFrom, contentTo: l.from };
    }
  }
  const last = state.doc.line(state.doc.lines);
  return { closeLine: state.doc.lines, contentFrom, contentTo: last.to };
}

function parseSections(state: EditorState): EditorSection[] {
  const sections: EditorSection[] = [];
  let currentMdLines: string[] = [];
  let mdStartLine = 1;
  let mdStartPos = 0;

  function flushMarkdown(endLine: number, endPos: number) {
    if (currentMdLines.length === 0) return;
    const content = currentMdLines.join("\n");
    if (content.trim().length > 0) {
      const embed = currentMdLines.length === 1 ? matchMarkdownEmbed(content.trim()) : null;
      if (embed) {
        sections.push({
          id: generateSectionId("embed", mdStartLine, content),
          type: "embed",
          from: mdStartPos,
          to: endPos,
          startLine: mdStartLine,
          endLine,
          embed,
        });
      } else {
        sections.push({
          id: generateSectionId("markdown", mdStartLine, content),
          type: "markdown",
          subtype: detectMarkdownSubtype(currentMdLines),
          from: mdStartPos,
          to: endPos,
          startLine: mdStartLine,
          endLine,
        });
      }
    }
    currentMdLines = [];
  }

  let lineNum = 1;
  while (lineNum <= state.doc.lines) {
    const line = state.doc.line(lineNum);
    const trimmed = line.text.trim();

    const dialectMatch = matchDialectFence(trimmed);
    const widgetMatch = matchWidgetFence(trimmed);
    const contentMatch = matchContentFence(trimmed);
    const genericFence = matchGenericFence(trimmed);

    if (dialectMatch || widgetMatch || contentMatch || genericFence) {
      flushMarkdown(lineNum - 1, line.from);

      const { closeLine, contentFrom, contentTo } = scanFenced(state, lineNum);
      const closeLineObj = state.doc.line(closeLine);
      const innerContent = state.doc.sliceString(contentFrom, contentTo);

      if (dialectMatch) {
        sections.push({
          id: generateSectionId(dialectMatch.dialect, lineNum, innerContent),
          type: dialectMatch.dialect,
          from: line.from,
          to: closeLineObj.to,
          startLine: lineNum,
          endLine: closeLine,
          contentFrom,
          contentTo,
          sport: dialectMatch.sport,
          contentId: blockContentId(innerContent),
        });
      } else if (widgetMatch) {
        sections.push({
          id: generateSectionId("widget", lineNum, innerContent),
          type: "widget",
          widgetName: widgetMatch,
          from: line.from,
          to: closeLineObj.to,
          startLine: lineNum,
          endLine: closeLine,
          contentFrom,
          contentTo,
        });
      } else if (contentMatch) {
        sections.push({
          id: generateSectionId("query", lineNum, innerContent),
          type: "query",
          from: line.from,
          to: closeLineObj.to,
          startLine: lineNum,
          endLine: closeLine,
          contentFrom,
          contentTo,
          queryType: contentMatch.widgetType,
          queryError: contentMatch.widgetError,
        });
      } else if (genericFence) {
        sections.push({
          id: generateSectionId("code", lineNum, innerContent),
          type: "code",
          from: line.from,
          to: closeLineObj.to,
          startLine: lineNum,
          endLine: closeLine,
          contentFrom,
          contentTo,
        });
      }

      lineNum = closeLine + 1;
      mdStartLine = lineNum;
      mdStartPos = lineNum <= state.doc.lines ? state.doc.line(lineNum).from : state.doc.length;
      continue;
    }

    if (currentMdLines.length === 0) {
      mdStartLine = lineNum;
      mdStartPos = line.from;
    }
    currentMdLines.push(line.text);
    lineNum++;
  }

  flushMarkdown(state.doc.lines, state.doc.length);
  return sections;
}

export const sectionField = StateField.define<SectionState>({
  create(state) {
    return { sections: parseSections(state) };
  },
  update(value, tr) {
    if (tr.docChanged || tr.effects.some((e) => e.is(forceSectionParse))) {
      const newSections = parseSections(tr.state);
      return { sections: mapIdentities(value.sections, newSections) };
    }
    return value;
  },
});

export function sectionAtPos(state: EditorState, pos: number): EditorSection | null {
  const { sections } = state.field(sectionField);
  return sections.find((s) => pos >= s.from && pos <= s.to) ?? null;
}

export function activeCursorSection(state: EditorState): EditorSection | null {
  const pos = state.selection.main.head;
  return sectionAtPos(state, pos);
}
