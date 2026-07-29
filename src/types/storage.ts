/**
 * Storage Types — V4 Multi-Source Data Lens
 * 
 * Defines the data model for the hierarchical IndexedDB storage.
 * V4 replaces the old scripts + section_history stores with a unified
 * `segments` store and adds `attachments` + `analytics` stores.
 */

import { WorkoutResults } from '../components/Editor/types';

// ---------------------------------------------------------------------------
// Segment data types — superset of old SectionType + new external sources
// ---------------------------------------------------------------------------
export type SegmentDataType =
    | 'script' | 'youtube' | 'markdown' | 'header' | 'frontmatter' | 'wod' | 'title' // legacy (V4–V10)
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; // V11 — heading levels replace `level` (S-06)

// ---------------------------------------------------------------------------
// Note — root container (unchanged structurally from V3)
// ---------------------------------------------------------------------------
/**
 * Note: the slim V11 container. Identity + routing + grouping only.
 * Content lives in `segments` (ordered by position, reconstructed at read);
 * journal grouping lives on the `page` store via pageId; tags live in
 * `tags`/`note_tags`. Legacy fields (rawContent, segmentIds, journalDate,
 * clonedIds, createdFrom, updatedAt, targetDate, templateId) were removed in
 * V11 — see indexeddb-storage-and-page-queries.md.
 */
export type NoteKind = 'note' | 'template' | 'playground' | 'journal';

export interface Note {
    id: string;           // UUID — canonical storage identity (V8)
    title: string;        // Display name

    // Routing sugar; routes resolve slug -> UUID. Never a storage or join key.
    slug?: string;
    /** V10 — FK to the `page` store (journal-date pages today; the page's
     *  `date` is the journal grouping key — N-02). */
    pageId?: string;

    // Metadata
    createdAt: number;

    // Note Management
    type?: NoteKind;
    /** N-10 — the note this one was created from (template/collection source).
     *  Renamed from templateId. */
    sourceId?: string;
}

// ---------------------------------------------------------------------------
// Page — named/slug-addressable grouped collection of notes (V10)
// ---------------------------------------------------------------------------
/**
 * Page: a grouped collection of notes. Two flavors:
 *   - calendar page: `date` set (YYYY-MM-DD) — one per journal date.
 *   - custom page: `slug` set — name/slug lookup for grouped collections.
 */
export interface Page {
    id: string;           // UUID
    date?: string;        // YYYY-MM-DD — calendar page (unique when present)
    slug?: string;        // custom page slug (unique when present)
    title?: string;
    createdAt: number;
}

// ---------------------------------------------------------------------------
// Tag / NoteTag — normalized note tagging (V10)
// ---------------------------------------------------------------------------
export type TagType = 'template' | 'playground' | 'qualification' | 'notebook' | 'general';

export interface Tag {
    id: string;           // UUID
    label: string;        // unique
    type?: TagType;
    createdAt: number;
}

export interface NoteTag {
    id: string;           // UUID
    noteId: string;
    tagId: string;
}

// ---------------------------------------------------------------------------
// NoteSegment — versioned content chunk (replaces Script + SectionHistory)
// ---------------------------------------------------------------------------
/**
 * NoteSegment: A versioned chunk of note content.
 * The compound key is [id, version] so every edit creates a new row.
 */
export interface NoteSegment {
    id: string;           // Positional section id (line-based); stable while the block stays at its position
    version: number;      // 1, 2, 3… bumps when the section content changes
    noteId: string;       // Parent Note UUID
    /** V11 — ordinal within the parent note (document order). Backfilled from
     *  the removed note.segmentIds array. */
    position?: number;
    /** V10 — FK to the `page` store (copied from the parent note). */
    pageId?: string;
    dataType: SegmentDataType;
    data: any;            // Structured JSON payload (the ScriptBlock for WOD sections)
    rawContent: string;   // Original markdown / source text
    createdAt: number;    // When this version was saved
    /** V10 — last time this incarnation was touched (defaults to createdAt). */
    updatedAt?: number;
    /** V10 — true for superseded versions; false for the latest per id. */
    isHistory?: boolean;
}

// ---------------------------------------------------------------------------
// BlockIndexRow — derived block index for WQL content queries (V14)
// ---------------------------------------------------------------------------
/**
 * Derived projection of a NoteSegment into queryable block-index fields.
 * Canonical source is the `segments` store; this store is disposable and can
 * be rebuilt by backfillV14. One row per non-history segment.
 */
export interface BlockIndexRow {
    /** Composite key: `${noteId}:${segmentId}:${segmentVersion}` */
    id: string;
    noteId: string;
    segmentId: string;
    segmentVersion: number;
    /** Ordinal within the parent note (document order). */
    position?: number;
    /** Segment data type: 'wod' | 'h1'..'h6' | 'markdown' | 'frontmatter'. */
    dataType: string;
    /** Content-stable identity for wod blocks (FNV-1a hash); undefined for prose. */
    blockContentId?: string;
    /** Searchable snippet — the segment's raw markdown text. */
    rawContent: string;
    /** Denormalized note title for display. */
    noteTitle: string;
    /** When the segment version was saved. */
    createdAt: number;
}

// ---------------------------------------------------------------------------
// WorkoutResult — execution log (mostly unchanged)
// ---------------------------------------------------------------------------
/**
 * ResultOrigin: which app surface produced a WorkoutResult / AnalyticsDataPoint.
 * 'playground' rows are recorded and viewable but excluded from default
 * journal/progress list filters. Absent on legacy rows — treated as 'journal'.
 */
export type ResultOrigin = 'journal' | 'playground';

/**
 * WorkoutResult: The outcome of running a specific segment version.
 */
export interface WorkoutResult {
    id: string;           // UUID

    /** Positional identity — FK to NoteSegment.id (the section id of the block run). */
    segmentId?: string;
    /** Version of the NoteSegment at record time. Undefined on legacy rows. */
    segmentVersion?: number;
    noteId: string;       // Link to parent Note (for easier querying)

    /** Section position identity — which block in the note this result belongs to. */
    blockId?: string;
    /** Content-stable identity — hash of the fenced content at recording time. */
    blockContentId?: string;
    /** LEGACY — content generation from the retired computeVersion() path.
     *  New rows carry segmentVersion instead; retained for pre-existing rows. */
    version?: number;

    /** Which surface produced this result; default filters exclude 'playground'. */
    origin?: ResultOrigin;

    /** V10 — FK to the `page` store (copied from the parent note). */
    pageId?: string;

    data: WorkoutResults; // The actual results data

    createdAt: number;  // When the workout was finished
}
// Attachment — external temporal data blobs (GPS / HR)
// ---------------------------------------------------------------------------
/**
 * Attachment: Temporal blob data attached to a workout (HR, GPS, etc.).
 */
export interface Attachment {
    id: string;           // UUID
    noteId: string;       // Parent Note
    /** V10 — FK to the `page` store (copied from the parent note). */
    pageId?: string;
    /** V10 — the WorkoutResult this blob belongs to, when known. */
    resultId?: string;
    mimeType: string;     // e.g. 'application/gpx+xml', 'application/json'
    label: string;        // Human-readable label (e.g. "Garmin HR stream")
    data: ArrayBuffer | string; // Raw blob or JSON string
    timeSpan: {
        start: number;    // Unix ms
        end: number;      // Unix ms
    };
    createdAt: number;
}

// ---------------------------------------------------------------------------
// AnalyticsDataPoint — de-normalized metric for cross-workout queries
// ---------------------------------------------------------------------------
/**
 * AnalyticsDataPoint: A single derived metric persisted for trend analysis.
 */
export interface AnalyticsDataPoint {
    id: string;
    noteId: string;
    /** V6 — content-stable join key; drives the `analytics.by-content` index for cross-workout trend queries. */
    blockContentId?: string;
    /** Which surface produced the parent result; trend queries exclude 'playground' by default. */
    origin?: ResultOrigin;
    /** V10 — FK to the `page` store (copied from the parent note). */
    pageId?: string;
    /** V10 — fact grain: per-segment rows vs whole-result summary rows.
     *  'rollup' (#736) — windowed aggregates (ACWR, monotony, strain) written
     *  by the lazy rollup driver on analytics-surface open. */
    grain?: 'segment' | 'summary' | 'rollup';
    /** V10 — effort catalog slug when the row derives from a known effort. */
    effortSlug?: string;
    /** V10/V12 — effort discipline from the canonical vocabulary
     *  (bodyweight, cycling, gymnastics, kettlebell, recovery, rowing,
     *  running, strength, swimming, walking — see effort-registry/disciplines). */
    discipline?: string;
    /** V12 — qualitative intensity bucket of the resolved effort, when known. */
    intensityTier?: string;
    segmentId: string;    // FK to NoteSegment.id (positional section id)
    segmentVersion: number;
    resultId: string;     // Link to raw WorkoutResult

    type: string;         // Stable metric key or derived family (e.g. 'totalLoad', 'elapsed')
    value: number | any;
    unit?: string;
    label: string;        // Human readable, e.g. "Average Heart Rate"
    metricKey?: string;    // Original key emitted by the runtime / calculator
    metricLabel?: string;  // Original human-readable metric label, when available
    metricUnit?: string;   // Original metric unit, when available

    timestamp: number;    // Effective workout date
    createdAt: number;    // Generation date
}

// ---------------------------------------------------------------------------
// Effort — the canonical effort entity is IEffort in effort-registry/types;
// the efforts store is typed with it directly (no storage-local duplicate).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Legacy aliases — keep downstream consumers compiling during transition
// ---------------------------------------------------------------------------

/** @deprecated Use NoteSegment instead. Alias kept for migration compatibility. */
export type SectionHistory = NoteSegment;

/** @deprecated Scripts store removed in V4. */
