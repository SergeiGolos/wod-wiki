/**
 * Section StateField Extension
 * 
 * CM6 StateField that continuously parses and tracks document sections
 * (Markdown vs WodScript). Maintains mapping between document ranges
 * and section types for use by preview decorations, linting, and autocomplete.
 * 
 * Per ADR: "Implement a CM6 StateField to continuously parse and track
 * document sections. This field will maintain mapping between document
 * ranges and section IDs."
 */

import { StateField, StateEffect, EditorState } from "@codemirror/state";

/** Section types the parser can identify */
export type EditorSectionType = "markdown" | "wod" | "frontmatter";

/** WOD dialect identifiers */
export type EditorDialect = "wod" | "log" | "plan";
const VALID_DIALECTS: EditorDialect[] = ["wod", "log", "plan"];

/** A parsed section range in the document */
export interface EditorSection {
  /** Unique identifier for stable tracking */
  id: string;
  /** Section type */
  type: EditorSectionType;
  /** Absolute character offset (inclusive) */
  from: number;
  /** Absolute character offset (exclusive) */
  to: number;
  /** Start line number (1-based) */
  startLine: number;
  /** End line number (1-based, inclusive) */
  endLine: number;
  /** WOD dialect (only for type === "wod") */
  dialect?: EditorDialect;
  /** Character offset of inner content start (after opening fence) */
  contentFrom?: number;
  /** Character offset of inner content end (before closing fence) */
  contentTo?: number;
}

/** Document section state */
export interface SectionState {
  sections: EditorSection[];
  version: number;
}

/** Effect to force re-parse */
export const forceSectionParse = StateEffect.define<null>();

/**
 * Parse document text into sections.
 * Identifies: fenced code blocks (```wod/log/plan), frontmatter (---), and markdown.
 */
function parseSections(state: EditorState): EditorSection[] {
  const doc = state.doc;
  const sections: EditorSection[] = [];
  const lineCount = doc.lines;

  let lineNum = 1;
  let mdFrom = -1; // Start of current markdown run
  let mdStartLine = -1;
  let sectionIdx = 0;

  while (lineNum <= lineCount) {
    const line = doc.line(lineNum);
    const trimmed = line.text.trim();

    // Check for WOD fence opening
    const dialect = matchDialectFence(trimmed);
    if (dialect) {
      // Flush pending markdown
      if (mdFrom >= 0) {
        const prevLine = doc.line(lineNum - 1);
        sections.push({
          id: `sec-${sectionIdx++}`,
          type: "markdown",
          from: mdFrom,
          to: prevLine.to,
          startLine: mdStartLine,
          endLine: lineNum - 1,
        });
        mdFrom = -1;
      }

      // Find closing fence
      const openLine = lineNum;
      const contentFrom = line.to + 1; // After the opening fence line
      let closeLine = lineNum;
      let contentTo = line.to;
      let foundClose = false;

      for (let j = lineNum + 1; j <= lineCount; j++) {
        const jLine = doc.line(j);
        if (jLine.text.trim() === "```") {
          closeLine = j;
          contentTo = jLine.from - 1; // Before the closing fence line
          foundClose = true;
          break;
        }
      }

      if (!foundClose) {
        closeLine = lineCount;
        contentTo = doc.line(lineCount).to;
      }

      sections.push({
        id: `sec-${sectionIdx++}`,
        type: "wod",
        from: line.from,
        to: doc.line(closeLine).to,
        startLine: openLine,
        endLine: closeLine,
        dialect,
        contentFrom: Math.min(contentFrom, doc.length),
        contentTo: Math.max(contentFrom, contentTo),
      });

      lineNum = closeLine + 1;
      continue;
    }

    // Check for frontmatter (--- delimiters)
    if (trimmed === "---") {
      // Look for closing ---
      let foundClose = false;
      let closeLine = lineNum;

      for (let j = lineNum + 1; j <= lineCount; j++) {
        const jLine = doc.line(j);
        // Don't cross into WOD blocks
        if (matchDialectFence(jLine.text.trim())) break;
        if (jLine.text.trim() === "---") {
          closeLine = j;
          foundClose = true;
          break;
        }
      }

      if (foundClose) {
        // Flush pending markdown
        if (mdFrom >= 0) {
          const prevLine = doc.line(lineNum - 1);
          sections.push({
            id: `sec-${sectionIdx++}`,
            type: "markdown",
            from: mdFrom,
            to: prevLine.to,
            startLine: mdStartLine,
            endLine: lineNum - 1,
          });
          mdFrom = -1;
        }

        sections.push({
          id: `sec-${sectionIdx++}`,
          type: "frontmatter",
          from: line.from,
          to: doc.line(closeLine).to,
          startLine: lineNum,
          endLine: closeLine,
          contentFrom: line.to + 1,
          contentTo: doc.line(closeLine).from - 1,
        });

        lineNum = closeLine + 1;
        continue;
      }
    }

    // Accumulate markdown
    if (mdFrom < 0) {
      mdFrom = line.from;
      mdStartLine = lineNum;
    }
    lineNum++;
  }

  // Flush trailing markdown
  if (mdFrom >= 0) {
    const lastLine = doc.line(lineCount);
    sections.push({
      id: `sec-${sectionIdx++}`,
      type: "markdown",
      from: mdFrom,
      to: lastLine.to,
      startLine: mdStartLine,
      endLine: lineCount,
    });
  }

  return sections;
}

function matchDialectFence(trimmed: string): EditorDialect | null {
  const lower = trimmed.toLowerCase();
  for (const d of VALID_DIALECTS) {
    if (lower === "```" + d || lower.startsWith("```" + d + " ") || lower.startsWith("```" + d + "\t")) {
      return d;
    }
  }
  return null;
}

/**
 * CM6 StateField that tracks document sections.
 * Re-parses on every document change.
 */
export const sectionField = StateField.define<SectionState>({
  create(state) {
    return { sections: parseSections(state), version: 0 };
  },
  update(value, tr) {
    // Force re-parse on explicit effect
    for (const e of tr.effects) {
      if (e.is(forceSectionParse)) {
        return { sections: parseSections(tr.state), version: value.version + 1 };
      }
    }
    // Re-parse on doc changes
    if (tr.docChanged) {
      return { sections: parseSections(tr.state), version: value.version + 1 };
    }
    return value;
  },
});

/**
 * Find which section contains a given position.
 */
export function sectionAtPos(state: EditorState, pos: number): EditorSection | null {
  const { sections } = state.field(sectionField);
  return sections.find(s => pos >= s.from && pos <= s.to) ?? null;
}

/**
 * Find which section contains the primary cursor.
 */
export function activeCursorSection(state: EditorState): EditorSection | null {
  const { head } = state.selection.main;
  return sectionAtPos(state, head);
}
