import type { StoredOutputStatement, WorkoutResults } from './results';

// ---------------------------------------------------------------------------
// Segment data types
// ---------------------------------------------------------------------------
export type SegmentDataType =
  | 'script'
  | 'youtube'
  | 'markdown'
  | 'header'
  | 'frontmatter'
  | 'wod'
  | 'title'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6';

// ---------------------------------------------------------------------------
// Note — root container
// ---------------------------------------------------------------------------
export type NoteKind = 'note' | 'template' | 'playground' | 'journal';

export interface Note {
  id: string; // UUID — canonical storage identity
  title: string; // Display name
  slug?: string;
  pageId?: string;
  createdAt: number;
  type?: NoteKind;
  sourceId?: string;
  catalog?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Page — named/slug-addressable grouped collection of notes
// ---------------------------------------------------------------------------
export interface Page {
  id: string;
  date?: string; // YYYY-MM-DD
  slug?: string;
  title?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Tag / NoteTag — normalized note tagging
// ---------------------------------------------------------------------------
export type TagType = 'template' | 'playground' | 'qualification' | 'notebook' | 'general';

export interface Tag {
  id: string;
  label: string;
  type?: TagType;
  createdAt: number;
}

export interface NoteTag {
  id: string;
  noteId: string;
  tagId: string;
}

// ---------------------------------------------------------------------------
// NoteSegment — versioned content chunk
// ---------------------------------------------------------------------------
export interface NoteSegment {
  id: string;
  version: number;
  noteId: string;
  position?: number;
  pageId?: string;
  dataType: SegmentDataType;
  data: unknown;
  rawContent: string;
  createdAt: number;
  updatedAt?: number;
  isHistory?: boolean;
}

// ---------------------------------------------------------------------------
// BlockIndexRow — derived block index for WQL content queries
// ---------------------------------------------------------------------------
export interface BlockIndexRow {
  /** Composite key: `${noteId}:${segmentId}:${segmentVersion}` */
  id: string;
  noteId: string;
  segmentId: string;
  segmentVersion: number;
  position?: number;
  dataType: string;
  blockContentId?: string;
  rawContent: string;
  noteTitle: string;
  createdAt: number;
  isStatic?: boolean;
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// WorkoutResult — execution log
// ---------------------------------------------------------------------------
export type ResultOrigin = 'journal' | 'playground';

export interface WorkoutResult {
  id: string;
  segmentId?: string;
  segmentVersion?: number;
  noteId: string;
  blockId?: string;
  blockContentId?: string;
  version?: number;
  origin?: ResultOrigin;
  pageId?: string;
  /** Write-path lifecycle (ticket 005): row born 'in-progress' at workout
   *  start, flipped to 'completed' at finalize. Absent = 'completed'
   *  (legacy rows predate streaming). */
  status?: 'in-progress' | 'completed';
  data: WorkoutResults;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Attachment — external temporal data blobs (GPS / HR)
// ---------------------------------------------------------------------------
export interface Attachment {
  id: string;
  noteId: string;
  pageId?: string;
  resultId?: string;
  mimeType: string;
  label: string;
  data: ArrayBuffer | string;
  timeSpan: {
    start: number;
    end: number;
  };
  createdAt: number;
}

// ---------------------------------------------------------------------------
// AnalyticsDataPoint — de-normalized metric for cross-workout queries
// ---------------------------------------------------------------------------
export interface AnalyticsDataPoint {
  id: string;
  noteId: string;
  blockContentId?: string;
  origin?: ResultOrigin;
  pageId?: string;
  grain?: 'event' | 'summary';
  effortSlug?: string;
  intensityTier?: string;
  grade?: string;
  segmentId: string;
  segmentVersion: number;
  resultId: string;
  type: string;
  value: unknown;
  unit?: string;
  label: string;
  metricKey?: string;
  metricLabel?: string;
  metricUnit?: string;
  timestamp: number;
  createdAt: number;
}


// ---------------------------------------------------------------------------
// UnifiedEventRecord — THE single stored record for all workout data
// (wayfinder ticket 002). Replaces AnalyticsDataPoint as the stored/query
// shape; results.data.logs stay the archival source of truth (ticket 005).
// ---------------------------------------------------------------------------

/** Store-row kind: 'event' = raw statement row, 'summary' = folded row.
 *  Authorship lives on `origin` (engine-authored summaries are finalize-owned;
 *  user-authored summaries — wellness — are reconcile-owned). Ticket 005. */
export type EventGrain = 'event' | 'summary';

/** Known producer values for the open `outputType` vocabulary (ticket 002:
 *  open string + known-values module; unknowns are stored and returned,
 *  matched only by kind-agnostic logic). */
export const KNOWN_OUTPUT_TYPES = [
  'segment',
  'system',
  'load',
  'event',
  'compiler',
  'completion',
  'analytics',
  'wellness',
] as const;

export interface UnifiedEventRecord {
  /**
   * Event rows:    `${resultId}:${seq}` — immutable, append-only.
   * Summary rows:  `${resultId}:summary:${metricKey}[:k=v…]` — deterministic
   *                content key; re-finalize overwrites cleanly (ticket 002).
   * Wellness rows: `wellness:${noteId}:${key}` — reconcile-owned upserts.
   */
  id: string;
  resultId: string;
  noteId: string;
  /** Content-stable cross-workout join key (promoted, ticket 003 amendment). */
  blockContentId?: string;
  pageId?: string;
  origin?: ResultOrigin;
  /** Canonical time — when the workout happened, never when derived. */
  timestamp: number;
  grain: EventGrain;
  /** Open vocabulary — see KNOWN_OUTPUT_TYPES. */
  outputType: string;
  effortSlug?: string;
  /** Typed metric array; EXACTLY ONE entry when grain:'summary'. Summary
   *  fold identity (canonicalKey, groupTags, effort metadata) lives in
   *  metrics[0].metadata — shape-uniform with events. */
  metrics: StoredOutputStatement['metrics'];
  timeSpan?: { started: number; ended?: number };
  sourceBlockKey?: string;
  stackLevel?: number;
  completionReason?: string;
  segmentId?: string;
  segmentVersion?: number;
}
