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
    /** V10 — fact grain: per-segment rows vs whole-result summary rows. */
    grain?: 'segment' | 'summary';
    /** V10 — effort catalog slug when the row derives from a known effort. */
    effortSlug?: string;
    /** V10 — effort discipline (e.g. 'weightlifting', 'monostructural'). */
    discipline?: string;
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
// Effort — user-defined or bundled exercise definition
// ---------------------------------------------------------------------------

export interface EffortBaseAttributes {
    met: number;
    discipline?: string;
    intensityTier?: 'low' | 'moderate' | 'high';
}

export interface EffortDerivation {
    parentSlug?: string;
    coefficients?: Record<string, number>;
    hardOverrides?: Record<string, unknown>;
}

export interface Effort {
    id: string;                    // UUID
    slug: string;                  // Canonical identifier (keyPath)
    label: string;                 // Human-readable name
    aliases: string[];             // Alternative names for fuzzy matching
    baseAttributes: EffortBaseAttributes;
    registrySource: 'bundled' | 'user' | 'synthetic-unresolved';
    derivation?: EffortDerivation;
    createdAt?: string;            // ISO timestamp
    updatedAt?: string;            // ISO timestamp
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep downstream consumers compiling during transition
// ---------------------------------------------------------------------------

/** @deprecated Use NoteSegment instead. Alias kept for migration compatibility. */
export type SectionHistory = NoteSegment;

/** @deprecated Scripts store removed in V4. */
