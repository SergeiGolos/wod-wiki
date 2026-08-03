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
 *  - time / log: Fenced workout block (```` ```time ````, ```` ```log ````, optional :sport suffix).
 *    The type IS the fence tag — `time` is runnable, `log` is recorded.
 *  - frontmatter: YAML front matter between `---` delimiters, rendered as table or embed.
 */

import type { ScriptBlock } from './index';
export type { ScriptBlock };

/** Workout fence tags — `time` is runnable, `log` is recorded (no Run affordance) */
export type FenceDialect = 'time' | 'log';

/** Ordered list of recognised workout fence tags */
export const VALID_FENCE_DIALECTS: FenceDialect[] = ['time', 'log'];

/** Section types the editor can parse and render */
export type SectionType = 'title' | 'markdown' | 'time' | 'log' | 'frontmatter' | 'embed';

/** Workout section types — the runnable/recorded fence tags */
export type WorkoutSectionType = Extract<SectionType, FenceDialect>;

/** Type guard for workout sections (`time` runnable / `log` recorded) */
export function isWorkoutSectionType(type: SectionType): type is WorkoutSectionType {
  return type === 'time' || type === 'log';
}

/** Typed front matter subtypes — determines embed renderer */
export type FrontMatterSubtype = 'default' | 'youtube' | 'strava' | 'amazon' | 'file' | 'effort';

/**
 * A single section in the document — the atomic unit of display and editing.
 */
export interface Section {
  /** Stable identifier (survives re-parse if structurally equivalent) */
  id: string;
  /** Content-stable identity (workout sections only) — survives clone/reorder/edit-above; results join on this. */
  contentId?: string;

  /** Structural type — determines which renderer is used */
  type: SectionType;

  /** Raw markdown text including syntax (# for headings, ```time fences, etc.) */
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

  /** Sport suffix from the fence (```log:climbing) — scopes the block's DialectStack. Only for workout sections. */
  sport?: string;

  /** Associated ScriptBlock (only for workout sections) */
  scriptBlock?: ScriptBlock;

  /** Front matter key-value pairs (only when type === 'frontmatter') */
  properties?: Record<string, string>;

  /** Typed front matter subtype (only when type === 'frontmatter') */
  frontmatterType?: FrontMatterSubtype;

  /** Embed specific data (only when type === 'embed') */
  embed?: {
    type: 'image' | 'link' | 'youtube';
    label: string;
    url: string;
    isImage: boolean;
  };

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
