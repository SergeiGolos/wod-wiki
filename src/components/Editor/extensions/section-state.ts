/**
 * Section StateField Extension (v2 — blank-line-aware, stable identity)
 *
 * CM6 StateField that continuously parses and tracks document sections.
 * Maintains mapping between document ranges and section types for use by
 * preview decorations, linting, autocomplete, and the overlay track.
 *
 * v2 changes over v1:
 *  - Blank-line-aware: consecutive non-blank lines form atomic markdown sections.
 *  - Markdown subtypes: heading, paragraph, list, blockquote, table, unknown.
 *  - Generic fenced code blocks: ```<lang> parsed as type "code" when not a WOD dialect.
 *  - Stable identity: deterministic hash-based IDs survive edits that don't change structure.
 *  - Incremental identity mapping: prior IDs are carried forward through transactions.
 */

import { StateField, StateEffect, EditorState, Transaction } from "@codemirror/state";

// ── Types ────────────────────────────────────────────────────────────

/** Section types the parser can identify */
export type EditorSectionType = "markdown" | "wod" | "frontmatter" | "code";

/** Markdown subtypes for routing per-section UI */
export type EditorSectionSubtype =
  | "heading"
  | "paragraph"
  | "list"
  | "blockquote"
  | "table"
  | "unknown";

/** WOD dialect identifiers */
export type EditorDialect = "wod" | "log" | "plan";
const VALID_DIALECTS: EditorDialect[] = ["wod", "log", "plan"];

/** A parsed section range in the document */
export interface EditorSection {
  /** Stable identifier (hash-based, survives structural-equivalent re-parses) */
  id: string;
  /** Section type */
  type: EditorSectionType;
  /** Markdown subtype (only for type === "markdown") */
  subtype?: EditorSectionSubtype;
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
  /** Fence language tag (only for type === "code") */
  language?: string;
  /** Character offset of inner content start (after opening fence / delimiter) */
  contentFrom?: number;
  /** Character offset of inner content end (before closing fence / delimiter) */
  contentTo?: number;
}

/** Document section state */
export interface SectionState {
  sections: EditorSection[];
  version: number;
}

/** Effect to force re-parse */
export const forceSectionParse = StateEffect.define<null>();

// ── Stable Identity ──────────────────────────────────────────────────

/**
 * Generate a deterministic section ID from type, start line, and a content hash.
 * Stable across re-parses when structure doesn't change.
 */
function generateSectionId(type: string, startLine: number, content: string): string {
  let hash = 0;
  const len = Math.min(content.length, 128);
  for (let i = 0; i < len; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  return `${type}-${startLine}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Carry forward stable IDs from the previous section list where sections
 * are structurally equivalent (same type, overlapping position, similar content).
 */
function mapIdentities(
  oldSections: EditorSection[],
  newSections: EditorSection[],
): EditorSection[] {
  if (oldSections.length === 0) return newSections;

  const usedOldIndices = new Set<number>();

  return newSections.map((sec) => {
    // Exact match: same type + same start line + same id (content hash matches)
    for (let i = 0; i < oldSections.length; i++) {
      if (usedOldIndices.has(i)) continue;
      const old = oldSections[i];
      if (old.type === sec.type && old.id === sec.id) {
        usedOldIndices.add(i);
        return sec; // already stable
      }
    }

    // Position match: same type + same start line (content may have changed)
    for (let i = 0; i < oldSections.length; i++) {
      if (usedOldIndices.has(i)) continue;
      const old = oldSections[i];
      if (old.type === sec.type && old.startLine === sec.startLine) {
        usedOldIndices.add(i);
        return { ...sec, id: old.id };
      }
    }

    // Proximity match: same type, start line shifted by ≤ 3 lines
    for (let i = 0; i < oldSections.length; i++) {
      if (usedOldIndices.has(i)) continue;
      const old = oldSections[i];
      if (old.type === sec.type && Math.abs(old.startLine - sec.startLine) <= 3) {
        usedOldIndices.add(i);
        return { ...sec, id: old.id };
      }
    }

    return sec;
  });
}

// ── Fence / Delimiter Matching ───────────────────────────────────────

function matchDialectFence(trimmed: string): EditorDialect | null {
  const lower = trimmed.toLowerCase();
  for (const d of VALID_DIALECTS) {
    if (
      lower === "```" + d ||
      lower.startsWith("```" + d + " ") ||
      lower.startsWith("```" + d + "\t")
    ) {
      return d;
    }
  }
  return null;
}

/**
 * Match a generic fenced code block opening (``` followed by a language tag
 * that is NOT a WOD dialect). Returns the language string or null.
 */
function matchGenericFence(trimmed: string): string | null {
  if (!trimmed.startsWith("```") || trimmed === "```") return null;
  // Already a WOD dialect?
  if (matchDialectFence(trimmed)) return null;
  // Extract language tag: everything after ``` up to first space/tab or end
  const rest = trimmed.slice(3).trim();
  if (rest.length === 0) return null;
  const lang = rest.split(/[\s\t]/)[0];
  return lang || null;
}

// ── Markdown Subtype Detection ───────────────────────────────────────

function detectMarkdownSubtype(lines: string[]): EditorSectionSubtype {
  // Find the first non-blank line to determine subtype
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (/^#{1,6}\s/.test(trimmed)) return "heading";
    if (/^[>\s]*>/.test(trimmed)) return "blockquote";
    if (/^\|.*\|/.test(trimmed)) return "table";
    if (/^[-*+]\s|^\d+[.)]\s/.test(trimmed)) return "list";
    return "paragraph";
  }
  return "unknown";
}

// ── Core Parser ──────────────────────────────────────────────────────

/**
 * Parse document text into sections.
 *
 * Rules:
 *  - Fenced WOD blocks (```wod/log/plan ... ```) become type "wod".
 *  - Generic fenced code blocks (```js, ```python, etc.) become type "code".
 *  - Frontmatter (--- ... ---) becomes type "frontmatter".
 *  - All remaining lines are grouped into "markdown" sections, split at
 *    blank-line boundaries. Each resulting markdown section gets a subtype.
 */
function parseSections(state: EditorState): EditorSection[] {
  const doc = state.doc;
  const sections: EditorSection[] = [];
  const lineCount = doc.lines;

  let lineNum = 1;

  // Accumulator for markdown runs (will be split at blank lines later)
  let mdLines: { num: number; text: string }[] = [];

  function flushMarkdown() {
    if (mdLines.length === 0) return;

    // Split accumulated markdown at blank-line boundaries
    let groupStart = 0;
    for (let i = 0; i <= mdLines.length; i++) {
      const isEnd = i === mdLines.length;
      const isBlank = !isEnd && mdLines[i].text.trim().length === 0;

      if (isBlank || isEnd) {
        // Flush the non-blank group before this blank line (or at end)
        if (i > groupStart) {
          const group = mdLines.slice(groupStart, i);
          const firstLine = doc.line(group[0].num);
          const lastLine = doc.line(group[group.length - 1].num);
          const content = doc.sliceString(firstLine.from, lastLine.to);
          const subtype = detectMarkdownSubtype(group.map((g) => g.text));

          sections.push({
            id: generateSectionId("markdown", group[0].num, content),
            type: "markdown",
            subtype,
            from: firstLine.from,
            to: lastLine.to,
            startLine: group[0].num,
            endLine: group[group.length - 1].num,
          });
        }

        // Blank line itself becomes its own section (preserves blank-line identity)
        if (isBlank) {
          const blankLine = doc.line(mdLines[i].num);
          sections.push({
            id: generateSectionId("markdown", mdLines[i].num, ""),
            type: "markdown",
            subtype: "unknown",
            from: blankLine.from,
            to: blankLine.to,
            startLine: mdLines[i].num,
            endLine: mdLines[i].num,
          });
        }

        groupStart = i + 1;
      }
    }

    mdLines = [];
  }

  while (lineNum <= lineCount) {
    const line = doc.line(lineNum);
    const trimmed = line.text.trim();

    // ── WOD fence ──
    const dialect = matchDialectFence(trimmed);
    if (dialect) {
      flushMarkdown();

      const openLine = lineNum;
      const contentFrom = line.to + 1;
      let closeLine = lineNum;
      let contentTo = line.to;
      let foundClose = false;

      for (let j = lineNum + 1; j <= lineCount; j++) {
        if (doc.line(j).text.trim() === "```") {
          closeLine = j;
          contentTo = doc.line(j).from - 1;
          foundClose = true;
          break;
        }
      }

      if (!foundClose) {
        closeLine = lineCount;
        contentTo = doc.line(lineCount).to;
      }

      const content = doc.sliceString(line.from, doc.line(closeLine).to);
      sections.push({
        id: generateSectionId("wod", openLine, content),
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

    // ── Generic fenced code block ──
    const lang = matchGenericFence(trimmed);
    if (lang) {
      flushMarkdown();

      const openLine = lineNum;
      const contentFrom = line.to + 1;
      let closeLine = lineNum;
      let contentTo = line.to;
      let foundClose = false;

      for (let j = lineNum + 1; j <= lineCount; j++) {
        if (doc.line(j).text.trim() === "```") {
          closeLine = j;
          contentTo = doc.line(j).from - 1;
          foundClose = true;
          break;
        }
      }

      if (!foundClose) {
        closeLine = lineCount;
        contentTo = doc.line(lineCount).to;
      }

      const content = doc.sliceString(line.from, doc.line(closeLine).to);
      sections.push({
        id: generateSectionId("code", openLine, content),
        type: "code",
        language: lang,
        from: line.from,
        to: doc.line(closeLine).to,
        startLine: openLine,
        endLine: closeLine,
        contentFrom: Math.min(contentFrom, doc.length),
        contentTo: Math.max(contentFrom, contentTo),
      });

      lineNum = closeLine + 1;
      continue;
    }

    // ── Frontmatter (--- delimiters) ──
    if (trimmed === "---") {
      let foundClose = false;
      let closeLine = lineNum;

      for (let j = lineNum + 1; j <= lineCount; j++) {
        const jLine = doc.line(j);
        if (matchDialectFence(jLine.text.trim())) break;
        if (matchGenericFence(jLine.text.trim())) break;
        if (jLine.text.trim() === "---") {
          closeLine = j;
          foundClose = true;
          break;
        }
      }

      if (foundClose) {
        flushMarkdown();

        const content = doc.sliceString(line.from, doc.line(closeLine).to);
        sections.push({
          id: generateSectionId("frontmatter", lineNum, content),
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

    // ── Accumulate markdown ──
    mdLines.push({ num: lineNum, text: line.text });
    lineNum++;
  }

  // Flush trailing markdown
  flushMarkdown();

  return sections;
}

// ── StateField ───────────────────────────────────────────────────────

/**
 * CM6 StateField that tracks document sections.
 * Re-parses on every document change and maps stable identities forward.
 */
export const sectionField = StateField.define<SectionState>({
  create(state) {
    return { sections: parseSections(state), version: 0 };
  },
  update(value, tr: Transaction) {
    // Force re-parse on explicit effect
    for (const e of tr.effects) {
      if (e.is(forceSectionParse)) {
        const fresh = parseSections(tr.state);
        return {
          sections: mapIdentities(value.sections, fresh),
          version: value.version + 1,
        };
      }
    }
    // Re-parse on doc changes, carrying forward stable IDs
    if (tr.docChanged) {
      const fresh = parseSections(tr.state);
      return {
        sections: mapIdentities(value.sections, fresh),
        version: value.version + 1,
      };
    }
    return value;
  },
});

// ── Query Helpers ────────────────────────────────────────────────────

/**
 * Find which section contains a given position.
 */
export function sectionAtPos(state: EditorState, pos: number): EditorSection | null {
  const { sections } = state.field(sectionField);
  return sections.find((s) => pos >= s.from && pos <= s.to) ?? null;
}

/**
 * Find which section contains the primary cursor.
 */
export function activeCursorSection(state: EditorState): EditorSection | null {
  const { head } = state.selection.main;
  return sectionAtPos(state, head);
}
