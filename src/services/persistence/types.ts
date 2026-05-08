import type { WorkoutResults } from '@/components/Editor/types';
import type { HistoryEntry } from '@/types/history';
import type { Attachment, AnalyticsDataPoint, Note, NoteSegment, WorkoutResult } from '@/types/storage';

export type NoteLocator =
  | string
  | {
      id?: string;
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
      sectionId: string;
    }
  | {
      mode: 'all-for-section';
      sectionId: string;
      limit?: number;
    }
  | {
      mode: 'all-for-note';
      limit?: number;
    };

export interface NoteQuery {
  ids?: string[];
  dateRange?: { start: number; end: number };
  daysBack?: number;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  projection?: 'summary' | 'history-detail';
}

export interface AnalyticsSegmentInput {
  id: string | number;
  elapsed?: number;
  metric: Record<string, unknown>;
  name?: string;
  absoluteStartTime?: number;
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
    targetDate: number;
    notes: string;
    type: 'note' | 'template' | 'playground';
    templateId: string;
    clonedIds: string[];
  }>;
  workoutResult?: {
    id?: string;
    sectionId?: string;
    data: WorkoutResults;
    completedAt?: number;
    analyticsSegments?: AnalyticsSegmentInput[];
  };
  analytics?: {
    segments: AnalyticsSegmentInput[];
    resultId?: string;
  };
  attachments?: {
    add?: Array<File | AttachmentInput>;
    remove?: string[];
  };
}

export type NotePersistenceErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'RESULT_NOT_FOUND'
  | 'RESULT_NOTE_MISMATCH';

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
  getNote(id: string): Promise<Note | undefined>;
  getAllNotes(): Promise<Note[]>;
  getLatestSegments(segmentIds: string[]): Promise<NoteSegment[]>;
  getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined>;
  getResultsForNote(noteId: string): Promise<WorkoutResult[]>;
  getResultsForSection(noteId: string, sectionId: string): Promise<WorkoutResult[]>;
  getResultById(resultId: string): Promise<WorkoutResult | undefined>;
  getAttachmentsForNote(noteId: string): Promise<Attachment[]>;
  saveAttachment(attachment: Attachment): Promise<string>;
  deleteAttachment(id: string): Promise<void>;
  saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void>;
}

export type { HistoryEntry, Attachment, AnalyticsDataPoint, WorkoutResult };
