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
export type ResultOrigin = 'journal' | 'playground' | 'user';

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
  /** Typed field reference provenance (ticket 11) — normalized path + kind
   *  of the variant this observation belongs to. */
  fieldRef?: { path: string; kind: string; dimension?: string };
  /** The observation's own civil date (YYYY-MM-DD) when it is date-only
   *  (ticket 12) — grouping uses this instead of a fabricated instant. */
  metricDate?: string;
  /** Temporal kind of the observation's anchor (ticket 12). */
  temporalKind?: 'instant' | 'civil-date';
  /** Ticket 14 provenance carried onto the fact (ticket 16 selection). */
  representationKind?: 'direct' | 'calculated' | 'substitute_summary';
  summaryCoverage?: SummaryCoverage;
  reducerStats?: ReducerStats;
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
  effortSlug?: string;
  /** Open vocabulary — see KNOWN_OUTPUT_TYPES. */
  outputType: string;
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
  /** Per-metric temporal anchors (ticket 12) — parallel to `metrics` when
   *  the producing statement carries its own instants/dates:
   *  'instant' = recorded occurrence instant; 'civil-date' = recorded civil
   *  date (date-only wellness), never a fabricated midnight. The row
   *  timestamp remains the V16 fetch anchor until the by-metricDate index
   *  (ticket 14); it must not relocate a metric whose own date differs. */
  metricTemporal?: MetricTemporal[];
  /** Ticket 14: civil-date keys (d:YYYY-MM-DD) of every metricTemporal with
   *  temporalKind 'civil-date' — the multiEntry `by-metric-date` index
   *  source. Kept distinct from the instant index on purpose: a date-only
   *  observation is never a midnight instant. */
  metricDateKeys?: string[];
  /** Ticket 14 provenance: how this row represents the underlying
   *  observations — directly recorded, calculated, or a substitute summary. */
  representationKind?: 'direct' | 'calculated' | 'substitute_summary';
  /** Ticket 14: the temporal/production scope a substitute summary covers. */
  summaryCoverage?: SummaryCoverage;
  /** Ticket 14: retained reducer statistics for substitution proofs. */
  reducerStats?: ReducerStats;
}

/** Scope descriptor of a substitute summary's coverage (ticket 14). */
export interface SummaryCoverage {
  scope: 'workout' | 'effort' | 'partition';
  effortSlug?: string;
  /** Partition identity (group-tag pairs, key-sorted). */
  groupTags?: Record<string, string>;
}

/** Retained statistics for substitution proofs (ticket 16 consumes).
 *  `observedCount` is the true represented observation count — never
 *  invented for legacy rows that lack it (undefined = insufficient
 *  evidence, not 1). */
export interface ReducerStats {
  observedCount?: number;
  sum?: number;
  min?: number;
  max?: number;
}

export interface MetricTemporal {
  temporalKind: 'instant' | 'civil-date';
  /** Occurrence instant (ms epoch) when temporalKind === 'instant'. */
  instant?: number;
  /** Civil YYYY-MM-DD when temporalKind === 'civil-date'. */
  civilDate?: string;
}

// ---------------------------------------------------------------------------
// Field Catalog — V17 derived stores (wayfinder datadog-analytics tickets
// 14/15). The catalog is a derived index of saved data: reference counts
// track supporting source records, rows prune at zero, and deltas commit
// atomically with the source mutation.
// ---------------------------------------------------------------------------

/** One typed field identity in the catalog. `id` is the collision-free
 *  typed key (see fieldRefKey in fields/fieldIdentity). */
export interface FieldCatalogEntry {
  id: string;
  /** Normalized full path — the ordered prefix-lookup key for typeahead. */
  path: string;
  kind: string;
  /** Physical/named dimension of a numeric variant, when known. */
  dimension?: string;
  /** Observed original spellings → supporting-source counts (provenance,
   *  not identity); a spelling disappears when its final support does. */
  spellings: Record<string, number>;
  /** Observed effective units → supporting-source counts. */
  units: Record<string, number>;
  /** Number of source records currently supporting this identity. */
  sourceCount: number;
  firstSeen: number;
  lastSeen: number;
}

/** One field identity a source record supports, with everything needed to
 *  reverse the contribution (per-source unit/spelling/value evidence). */
export interface FieldContribution {
  fieldId: string;
  path: string;
  kind: string;
  unit?: string;
  /** Original spelling this source used. */
  spelling?: string;
  /** Categorical value (string/boolean fields only) — original spelling. */
  value?: string;
}

/** The contribution set of one stable source record — the reversal record
 *  that makes re-saves idempotent and deletions reversible. Contributions
 *  are attributed to their owning row id, so streaming appends, finalize
 *  replacement, and cascade deletes reverse exactly the affected rows. */
export interface FieldSourceRecord {
  /** `${entityKind}:${recordId}` — e.g. `result:r1`, `note:n1`. */
  id: string;
  contributions: Array<FieldContribution & { rowId: string }>;
}

/** One observed categorical value of a field (string/boolean only). */
export interface FieldValueRecord {
  key: [string, string]; // [fieldId, value] — value keeps original spelling
  fieldId: string;
  value: string;
  sourceCount: number;
}

/** Backfill progress/completion marker (field_catalog_meta store). */
export interface CatalogBackfillState {
  id: 'backfill';
  status: 'initializing' | 'complete';
  /** Last processed source key per source store (resume cursor). */
  cursor?: { results?: string; notes?: string };
  revision: number;
  updatedAt: number;
}
