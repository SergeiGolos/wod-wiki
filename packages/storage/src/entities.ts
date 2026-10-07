/**
 * Storage Types — V4 Multi-Source Data Lens
 *
 * Defines the data model for the hierarchical IndexedDB storage.
 * V4 replaces the old scripts + section_history stores with a unified
 * `segments` store and adds `attachments` + `analytics` stores.
 *
 * Canonical home of the entity model (moved verbatim from
 * apps/playground/src/types/storage.ts).
 */

import type { ScriptBlock } from '@bitcobblers/wod-wiki-core';

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
export type NoteKind = 'journal' | 'template' | 'playground' | 'collection' | 'dashboard' | 'page' | (string & {});

export interface Note {
    id: string;           // UUID — canonical storage identity (V8)
    title: string;        // Display name

    // Metadata
    /** Domain date of the record (e.g. workout date, publish date) */
    date?: number;
    createdAt: number;
    tags?: string[];

    // Note Management
    type?: NoteKind;
    /** N-10 — the note this one was created from (template/collection source).
     *  Renamed from templateId. */
    sourceId?: string;
    /** Catalog id for static notes (the directory under markdown/collections
     *  or markdown/feeds, with the `feeds/` wrapper stripped). Synthesised by
     *  QueryService.staticNotesFromBlocks; undefined for journal notes. */
    catalog?: string;

    // ── Seed provenance (docs/prototypes/seed-data-unification.md) ──
    /** Set on rows the Seed Import owns. Absent ≡ user-owned: the importer
     *  only ever overwrites or deletes rows with seedOrigin === 'seed'. The
     *  edit path flips this to 'user' on first user change (phase 3). */
    seedOrigin?: 'seed' | 'user';
    /** manifest.version of the last seed write (seed rows only). */
    seedVersion?: number;
    /** The seed chunk this row came from (seed rows only). */
    seedChunkId?: string;
    /** Original seed file path (e.g. `markdown/collections/girls/fran.md`) — the
     *  deterministic UUID is derived from this path; retained for seed content
     *  reconstruction (canvas routes, collection READMEs, block-index lookup). */
    sourcePath?: string;
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
    date?: string;        // YYYY-MM-DD — calendar/publish date (unique when present)
    slug?: string;        // custom page slug (unique when present)
    title?: string;
    createdAt: number;
}

// ---------------------------------------------------------------------------
// PageNote — N:M junction linking a Note to a Page (V22)
// ---------------------------------------------------------------------------
export interface PageNote {
    id: string;           // UUID
    pageId: string;
    noteId: string;
    position?: number;
    createdAt: number;
}

// ---------------------------------------------------------------------------
// Tag / NoteTag — normalized note tagging (V10)
// ---------------------------------------------------------------------------
export type TagType = 'template' | 'playground' | 'qualification' | 'notebook' | 'general' | (string & {});

export interface TagTypeRecord {
    id: string;           // UUID
    name: string;         // unique slug/identifier, e.g. "discipline", "equipment"
    label: string;        // display name, e.g. "Discipline"
    color?: string;       // hex or color token
    createdAt: number;
}

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
    /** @deprecated V10 legacy placement field. Placements are owned exclusively by `page_notes`. */
    pageId?: string;
    dataType: SegmentDataType;
    data: ScriptBlock | null; // Structured JSON payload (the ScriptBlock for WOD sections)
    rawContent: string;   // Original markdown / source text
    /** Exact document fragment, including its following line separator. Absent on legacy rows. */
    sourceContent?: string;
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
    /** True for bundled static content (collections, feeds); false for user journal. */
    isStatic?: boolean;
    /** Original source identifier for static files. */
    sourceId?: string;
    /** Full corpus source path (e.g. `markdown/collections/girls/fran.md`) —
     *  the exact join key to `Note.sourcePath`. The seed importer maps
     *  `noteId` to the imported note UUID through it; missing or ambiguous
     *  mappings abort the import. */
    sourcePath?: string;
    /** Legacy route identity the compiler used before noteId became a real
     *  note UUID (path stem, feed route, canvas route). Retained as route
     *  sugar for deep links — never a storage join key. */
    routeId?: string;
}

// ---------------------------------------------------------------------------
// BlockEffort — exercise containment index (V24)
// ---------------------------------------------------------------------------
/**
 * Relational junction linking blocks to the exercises they contain.
 * Populated by `rebuildBlockIndexForNote` (user notes) and the seed compiler.
 * Enables O(1) bidirectional lookups without scanning raw markdown.
 */
export interface BlockEffort {
    /** Compound key: `${noteId}:${segmentId}:${effortSlug}` or `static:${noteId}:${segmentId}:${effortSlug}` */
    id: string;
    /** Parent note UUID */
    noteId: string;
    /** Positional block ID within the note (NoteSegment.id) */
    blockId: string;
    /** Content-stable hash of the block (SHA-256/FNV-1a) */
    blockContentId?: string;
    /** Canonical exercise slug (e.g. 'thruster', 'pull-up', 'clean-and-jerk') */
    effortSlug: string;
    /** True for bundled static content (collections, feeds); false for user journal. */
    isStatic?: boolean;
    /** Full corpus source path of the containing block's file — the seed
     *  importer maps `noteId` to the imported note UUID through it. */
    sourcePath?: string;
    /** When the row was saved. */
    createdAt: number;
}

// ---------------------------------------------------------------------------
// Session — execution log (mostly unchanged)
// ---------------------------------------------------------------------------
/**
 * ResultOrigin: which app surface produced a Session / AnalyticsDataPoint.
 * 'playground' rows are recorded and viewable but excluded from default
 * journal/progress list filters. Absent on legacy rows — treated as 'journal'.
 */
export type ResultOrigin = 'journal' | 'playground' | 'user';

/**
 * Session: A pure execution metadata record (renamed from Session; table results -> sessions in DB V20, flattened in V21).
 * Statements and metrics stream directly to `EventRecord` rows in the `events` table.
 */
export interface Session {
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
    /** Write-path lifecycle (unified event store): row born 'in-progress' at
     *  workout start, flipped to 'completed' at finalize. Absent = 'completed'
     *  (legacy rows predate streaming). */
    status?: 'in-progress' | 'completed';

    /** @deprecated V10 legacy placement field. Note placements are owned exclusively by `page_notes`. */
    pageId?: string;

    /** When workout started */
    startTime: number;

    /** When workout ended */
    endTime: number;

    /** Total elapsed time (ms) */
    duration: number;

    /** Rounds completed (for rounds-based workouts) */
    roundsCompleted?: number;

    /** Total rounds (for rounds-based workouts) */
    totalRounds?: number;

    /** Reps completed (for rep-based workouts) */
    repsCompleted?: number;

    /** Whether workout was completed or stopped early */
    completed: boolean;

    createdAt: number;  // When the workout was finished
}

// ---------------------------------------------------------------------------
// Attachment — external temporal data blobs (GPS / HR)
// ---------------------------------------------------------------------------
/**
 * Attachment: Temporal blob data attached to a workout (HR, GPS, etc.).
 */
export interface Attachment {
    id: string;           // UUID
    noteId: string;       // Parent Note
    /** @deprecated V10 legacy placement field. Note placements are owned exclusively by `page_notes`. */
    pageId?: string;
    /** V10 — the Session this blob belongs to, when known. */
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
// AnalyticsDataPoint — flat fact currency for cross-workout queries
// ---------------------------------------------------------------------------
/**
 * AnalyticsDataPoint is owned by `@bitcobblers/wod-wiki-core` (0.6.36): the
 * flat per-metric projection the WQL four-stage plan consumes. It is no
 * longer a storage schema row — the unified `events` store holds
 * EventRecord rows (grain 'event' | 'summary') and
 * `projectEventToFacts` folds them into this shape at query time.
 */
export type { AnalyticsDataPoint, EventRecord, EventGrain, } from '@bitcobblers/wod-wiki-core';

// ---------------------------------------------------------------------------
// Effort — the canonical effort entity is IEffort in @bitcobblers/wod-wiki-lang;
// the efforts store is typed with it directly (no storage-local duplicate).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Membership — identity + profile for the records a user creates (V25)
// ---------------------------------------------------------------------------
/**
 * Membership: the account/profile row behind user-owned records. In
 * IndexedDB mode there is exactly one membership (id DEFAULT_MEMBERSHIP_ID)
 * and its source of truth is localStorage — this store exists for schema
 * parity and API mode, where the server keeps the membership table (and
 * wipe() must never destroy it — StoreDef.system). Body metrics are stored
 * as entered (unit-tagged, no normalization); age is derived from birthDate
 * at display time.
 */
export interface Membership {
  id: string;             // DEFAULT_MEMBERSHIP_ID ('default') in local mode
  displayName: string;
  /** Profile picture: client-resized JPEG data URL (≤256px, ~tens of KB). */
  picture?: string;
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  height?: number;
  heightUnit?: 'cm' | 'in';
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string;
  createdAt: number;
  updatedAt?: number;
}
