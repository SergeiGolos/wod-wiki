/**
 * Storage Types — V4 Multi-Source Data Lens
 * 
 * Defines the data model for the hierarchical IndexedDB storage.
 * V4 replaces the old scripts + section_history stores with a unified
 * `segments` store and adds `attachments` + `analytics` stores.
 */

import { WorkoutResults } from '../markdown-editor/types';
import { WodBlock } from '../markdown-editor/types/section';

// ---------------------------------------------------------------------------
// Segment data types — superset of old SectionType + new external sources
// ---------------------------------------------------------------------------
export type SegmentDataType = 'script' | 'youtube' | 'markdown' | 'header' | 'frontmatter' | 'wod' | 'title';

// ---------------------------------------------------------------------------
// Note — root container (unchanged structurally from V3)
// ---------------------------------------------------------------------------
/**
 * Note: A collection of versioned segments and metadata.
 * Think of this as the "Folder" or "File" container.
 */
export interface Note {
    id: string;           // UUID
    title: string;        // Display name
    rawContent: string;   // Current/Draft content (for search/preview)

    // Metadata
    tags: string[];
    createdAt: number;
    updatedAt: number;    // Last edit time
    targetDate: number;   // Primary date for view/sorting
    segmentIds: string[]; // Ordered list of segment UUIDs

    // Note Management
    type?: 'note' | 'template';
    templateId?: string;
    clonedIds?: string[];              // IDs of notes cloned FROM this note
}

// ---------------------------------------------------------------------------
// NoteSegment — versioned content chunk (replaces Script + SectionHistory)
// ---------------------------------------------------------------------------
/**
 * NoteSegment: A versioned chunk of note content.
 * The compound key is [id, version] so every edit creates a new row.
 */
export interface NoteSegment {
    id: string;           // Stable UUID across versions
    version: number;      // 1, 2, 3…
    noteId: string;       // Parent Note UUID
    dataType: SegmentDataType;
    data: any;            // Structured JSON payload (e.g. WodBlock)
    rawContent: string;   // Original markdown / source text
    level?: number;       // For headings
    wodBlock?: WodBlock;  // For WOD sections (carried from legacy)
    createdAt: number;    // When this version was saved
}

// ---------------------------------------------------------------------------
// WorkoutResult — execution log (mostly unchanged)
// ---------------------------------------------------------------------------
/**
 * WorkoutResult: The outcome of running a specific segment version.
 */
export interface WorkoutResult {
    id: string;           // UUID

    segmentId?: string;   // Link to specific NoteSegment
    segmentVersion?: number;
    noteId: string;       // Link to parent Note (for easier querying)
    sectionId?: string;   // Legacy link to old section

    data: WorkoutResults; // The actual results data

    completedAt: number;  // When the workout was finished
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
    segmentId: string;
    segmentVersion: number;
    resultId: string;     // Link to raw WorkoutResult

    metricType: string;   // 'total_reps', 'avg_hr', 'pace', etc.
    value: number | any;
    unit?: string;
    label: string;        // Human readable, e.g. "Average Heart Rate"

    timestamp: number;    // Effective workout date
    createdAt: number;    // Generation date
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep downstream consumers compiling during transition
// ---------------------------------------------------------------------------

/** @deprecated Use NoteSegment instead. Alias kept for migration compatibility. */
export type SectionHistory = NoteSegment;

/** @deprecated Scripts store removed in V4. */
export interface Script {
    id: string;
    noteId: string;
    content: string;
    versionHash: string;
    createdAt: number;
}

// ---------------------------------------------------------------------------
// Database Schema Interface — V4
// ---------------------------------------------------------------------------
export interface WodWikiSchema {
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-updated': number; 'by-target-date': number };
    };
    segments: {
        key: [string, number]; // [id, version]
        value: NoteSegment;
        indexes: { 'by-note': string; 'by-type': SegmentDataType };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: { 'by-segment': string; 'by-note': string; 'by-completed': number };
    };
    attachments: {
        key: string;
        value: Attachment;
        indexes: { 'by-note': string; 'by-time': number };
    };
    analytics: {
        key: string;
        value: AnalyticsDataPoint;
        indexes: { 'by-type': string; 'by-segment': string; 'by-result': string };
    };
}
