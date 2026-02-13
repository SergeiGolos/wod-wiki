/**
 * Section Types
 * 
 * Core data model for the section-based editor.
 * A Section is an atomic renderable unit of a markdown document:
 * title (first row), markdown content, or WOD syntax block.
 * 
 * Section types:
 *  - title: Special first section — editing updates the note title.
 *  - markdown: Free-form markdown content rendered as rich text.
 *  - wod: Fenced code block (```` ```wod ````, ```` ```log ````, ```` ```plan ````).
 */

import type { WodBlock } from './index';
export type { WodBlock };

/** Valid WOD dialect identifiers — each loads different strategies */
export type WodDialect = 'wod' | 'log' | 'plan';

/** Ordered list of recognised dialect fence names */
export const VALID_WOD_DIALECTS: WodDialect[] = ['wod', 'log', 'plan'];

/** Section types the editor can parse and render */
export type SectionType = 'title' | 'markdown' | 'wod';

/**
 * A single section in the document — the atomic unit of display and editing.
 */
export interface Section {
  /** Stable identifier (survives re-parse if structurally equivalent) */
  id: string;

  /** Structural type — determines which renderer is used */
  type: SectionType;

  /** Raw markdown text including syntax (# for headings, ```wod fences, etc.) */
  rawContent: string;

  /** Display content (heading text without #, paragraph text, WOD inner content) */
  displayContent: string;

  /** Start line in overall document (0-indexed) */
  startLine: number;

  /** End line in overall document (0-indexed, inclusive) */
  endLine: number;

  /** Computed line count: endLine - startLine + 1 */
  lineCount: number;

  /** Heading level 1-6 (only meaningful inside markdown sections) */
  level?: number;

  /** WOD dialect — only set when type === 'wod' */
  dialect?: WodDialect;

  /** Associated WodBlock (only when type === 'wod') */
  wodBlock?: WodBlock;

  /** Section version (increments on content change or soft-delete) */
  version: number;

  /** Creation timestamp (Unix ms) */
  createdAt: number;

  /** Soft-delete flag — section is hidden but preserved for undo / history */
  deleted?: boolean;
}

/**
 * The full document as an ordered section list.
 */
export interface SectionDocument {
  /** Ordered list of all sections (including soft-deleted ones) */
  sections: Section[];

  /** Total line count across visible sections */
  totalLines: number;

  /** Currently active (editing) section id */
  activeSectionId: string | null;
}
