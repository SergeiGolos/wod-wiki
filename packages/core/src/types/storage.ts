import type { WorkoutResults } from './results';

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
  grain?: 'segment' | 'summary' | 'rollup';
  effortSlug?: string;
  discipline?: string;
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

