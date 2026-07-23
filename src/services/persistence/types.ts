import type { WorkoutResults } from '@/components/Editor/types';
import type { HistoryEntry } from '@/types/history';
import type { Attachment, AnalyticsDataPoint, Note, NoteKind, NoteSegment, ResultOrigin, WorkoutResult } from '@/types/storage';

export type NoteLocator =
  | string
  | {
      id?: string;
      slug?: string;
      shortId?: string;
      title?: string;
    };

export interface GetNoteOptions {
  projection?: 'summary' | 'workbench' | 'review' | 'history-detail';
  resultSelection?: ResultSelection;
  includeAttachments?: boolean;
  includeSections?: boolean;
}

export type ResultSelection =
  | {
      mode: 'latest';
    }
  | {
      mode: 'by-result-id';
      resultId: string;
    }
  | {
      mode: 'latest-for-section';
      blockContentId: string;
    }
  | {
      mode: 'all-for-section';
      blockContentId: string;
      limit?: number;
    }
  | {
      mode: 'all-for-note';
      limit?: number;
    };

export interface CreateNoteInput {
  id: string;
  title: string;
  rawContent: string;
  targetDate: number;
  journalDate?: string;
  tags?: string[];
  type?: NoteKind;
  slug?: string;
  /** N-10 — the note this one was created from (template/collection source). */
  sourceId?: string;
}

export interface NoteQuery {
  ids?: string[];
  dateRange?: { start: number; end: number };
  daysBack?: number;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  projection?: 'summary' | 'history-detail';
  journalDate?: string;
  kind?: NoteKind;
}

export interface AttachmentFileInput {
  id?: string;
  file: File;
  label?: string;
  mimeType?: string;
  timeSpan?: { start: number; end: number };
}

export interface AttachmentDataInput {
  id?: string;
  label: string;
  mimeType: string;
  data: ArrayBuffer | string;
  timeSpan?: { start: number; end: number };
}

export type AttachmentInput = AttachmentFileInput | AttachmentDataInput;

export interface NoteMutation {
  rawContent?: string;
  metadata?: Partial<{
    title: string;
    tags: string[];
    journalDate: string;
    notes: string;
    type: NoteKind;
    sourceId: string;
    slug: string;
  }>;
  workoutResult?: {
    id?: string;
    blockId?: string;       // Section position identity
    blockContentId?: string;  // Content-stable join key
    version?: number;        // LEGACY — content generation from the retired computeVersion path
    segmentId?: string;     // NoteSegment FK (positional section id)
    origin?: ResultOrigin;  // Which surface produced the result; default filters exclude 'playground'
    data: WorkoutResults;
    createdAt?: number;
  };
  /** Note kind applied ONLY when the mutation lazily creates a missing note;
   *  never overwrites an existing note's type. */
  noteType?: NoteKind;
  attachments?: {
    add?: Array<File | AttachmentInput>;
    remove?: string[];
  };
}

export type NotePersistenceErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'RESULT_NOT_FOUND'
  | 'RESULT_NOTE_MISMATCH'
  | 'SEGMENT_NOT_FOUND';

export class NotePersistenceError extends Error {
  constructor(
    readonly code: NotePersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'NotePersistenceError';
  }
}

export interface NotePersistenceStorage {
  getNoteBySlug?(slug: string): Promise<Note | undefined>;
  getNote(id: string): Promise<Note | undefined>;
  saveNote(note: Note): Promise<string>;
  getAllNotes(): Promise<Note[]>;
  getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined>;
  /** Compound-key read: the exact segment incarnation recorded for a result. */
  getSegment?(segmentId: string, version: number): Promise<NoteSegment | undefined>;
  getResultsForNote(noteId: string): Promise<WorkoutResult[]>;
  saveResult(result: WorkoutResult): Promise<string>;
  /** V6 — cross-note collection aggregation: every result for one blockContentId, across all notes. */
  getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]>;
  getResultsForSection(noteId: string, sectionId: string): Promise<WorkoutResult[]>;
  getResultById(resultId: string): Promise<WorkoutResult | undefined>;
  getAttachmentsForNote(noteId: string): Promise<Attachment[]>;
  saveAttachment(attachment: Attachment): Promise<string>;
  deleteAttachment(id: string): Promise<void>;
  saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void>;
  /** Delete all fact rows for one result (replay/re-derivation cascade). */
  deleteAnalyticsPointsForResult?(resultId: string): Promise<void>;
}

export type { HistoryEntry, Attachment, AnalyticsDataPoint, WorkoutResult };
