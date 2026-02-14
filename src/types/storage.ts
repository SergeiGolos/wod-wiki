/**
 * Storage Types
 * 
 * Defines the data model for the hierarchical IndexedDB storage.
 */

import { WorkoutResults } from '../markdown-editor/types';
import { SectionType, WodBlock } from '../markdown-editor/types/section';

/**
 * Note: A collection of workout scripts (versions) and metadata.
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
}

/**
 * Script: A specific version of a WOD script.
 * Immutable once created (mostly).
 */
export interface Script {
    id: string;           // UUID
    noteId: string;       // Parent Note UUID

    content: string;      // The full markdown content of this version
    versionHash: string;  // Simple hash to detect content changes from previous version

    createdAt: number;    // When this version was saved
}

/**
 * WorkoutResult: The outcome of running a specific script version.
 */
export interface WorkoutResult {
    id: string;           // UUID

    scriptId: string;     // Link to specific Script version
    noteId: string;       // Link to parent Note (for easier querying)

    data: WorkoutResults; // The actual results data

    completedAt: number;  // When the workout was finished
}

/**
 * SectionHistory: Snapshot of a section's content at a specific version.
 */
export interface SectionHistory {
    sectionId: string;    // UUID
    version: number;      // Version number
    noteId: string;       // Parent Note UUID
    content: string;      // The clean content
    type: SectionType;    // Structural type
    level?: number;       // For headings
    wodBlock?: WodBlock;  // For WOD sections
    timestamp: number;    // When this version was saved
}

/**
 * Database Schema Interface
 */
export interface WodWikiSchema {
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-updated': number, 'by-target-date': number };
    };
    scripts: {
        key: string;
        value: Script;
        indexes: { 'by-note': string, 'by-created': number };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: { 'by-script': string, 'by-note': string, 'by-completed': number };
    };
    'section_history': {
        key: [string, number]; // sectionId, version
        value: SectionHistory;
        indexes: { 'by-section': string, 'by-note': string };
    };
}
