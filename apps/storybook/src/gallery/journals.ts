/**
 * Corpus journal loading + QueryService wiring for the analytics gallery.
 *
 * Every gallery section shares this: journals load once from the wql corpus
 * fixtures, and each journal gets a QueryService over `inMemoryEventStore`
 * with the content-plane stores built from the journal itself — the same
 * round trip the app uses (store abstraction → QueryService), minus
 * IndexedDB.
 *
 * Card queries MUST pin `rangeEnd` to the journal's newest record: corpus
 * timestamps are June–July 2026, so default "last N weeks" windows are empty.
 *
 * Content plane: `find:note` reads the journal's notes directly;
 * `find:block` reads a block index DERIVED from the journal's records —
 * one row per distinct (noteId, segmentId, segmentVersion, blockContentId),
 * `dataType: 'wod'`, `rawContent` = the note's title (the corpus journals
 * carry no markdown body — the derivation is a gallery-side projection,
 * not fixture data). `find:effort` reads the engine's bundled effort
 * registry — the same source the app loads via CompositeEffortRegistry.
 */
import {
  QueryService,
  inMemoryEventStore,
  type BlockIndexRow,
  type BlockQueryStore,
  type EffortQueryStore,
  type NoteQueryStore,
} from '@bitcobblers/wod-wiki-engine';
import { bundledEfforts } from '@bitcobblers/wod-wiki-lang';
// wql's own IEffort — the engine umbrella re-exports lang's IEffort under the
// same name, and the two differ on baseAttributes' index signature (the same
// engine-internal inconsistency the app's RegistryEffortStore casts around).
import type { IEffort } from '@bitcobblers/wod-wiki-wql';
import type { Note, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';

import crossfitJournal from '../../../../packages/wql/fixtures/corpus/crossfit-multi-week.json';
import enduranceJournal from '../../../../packages/wql/fixtures/corpus/endurance-block.json';
import wellnessJournal from '../../../../packages/wql/fixtures/corpus/mixed-wellness.json';
import climbJournal from '../../../../packages/wql/fixtures/corpus/climb-yoga.json';

export type JournalKey = 'crossfit' | 'endurance' | 'wellness' | 'climb';

export interface RawJournal {
  id: string;
  title: string;
  records: UnifiedEventRecord[];
  notes: Array<{ id: string; title: string; createdAt: number; tags?: string[] }>;
}

export const JOURNALS: Record<JournalKey, RawJournal> = {
  crossfit: crossfitJournal as unknown as RawJournal,
  endurance: enduranceJournal as unknown as RawJournal,
  wellness: wellnessJournal as unknown as RawJournal,
  climb: climbJournal as unknown as RawJournal,
};

/** Newest record timestamp in a journal — the pinned `rangeEnd` for cards. */
export function newestTimestamp(journal: RawJournal): number {
  return Math.max(...journal.records.map((r) => r.timestamp as number));
}

/**
 * Block index derived from a journal's records — one BlockIndexRow per
 * distinct (noteId, segmentId, segmentVersion, blockContentId). The corpus
 * journals carry no markdown body, so `rawContent` is the note title.
 */
export function deriveBlockIndex(journal: RawJournal): BlockIndexRow[] {
  const titleByNote = new Map(journal.notes.map((n) => [n.id, n.title]));
  const byKey = new Map<string, BlockIndexRow>();
  for (const r of journal.records) {
    if (!r.blockContentId) continue;
    const id = `${r.noteId}:${r.segmentId}:${r.segmentVersion}`;
    if (byKey.has(id)) continue;
    byKey.set(id, {
      id,
      noteId: r.noteId as string,
      segmentId: (r.segmentId ?? '') as string,
      segmentVersion: (r.segmentVersion ?? 0) as number,
      dataType: 'wod',
      blockContentId: r.blockContentId as string,
      rawContent: titleByNote.get(r.noteId as string) ?? '',
      noteTitle: titleByNote.get(r.noteId as string) ?? '',
      createdAt: r.timestamp as number,
    });
  }
  return [...byKey.values()];
}

/** Bundled effort registry — the engine's seed set (5 efforts, all tiers). */
const bundledEffortStore: EffortQueryStore = {
  getAllEfforts: async (): Promise<IEffort[]> => [...bundledEfforts] as unknown as IEffort[],
};

/** QueryService over one journal's in-memory stores, content plane included. */
export function buildServiceForJournal(journal: RawJournal): QueryService {
  const noteStore: NoteQueryStore = {
    getAllNotes: async () => journal.notes as unknown as Note[],
    getNoteIdsForTag: async (label: string) => {
      const ids = journal.notes.filter((n) => (n.tags ?? []).includes(label)).map((n) => n.id);
      return new Set(ids);
    },
    getNoteTagLabels: async (noteId: string) =>
      journal.notes.find((n) => n.id === noteId)?.tags ?? [],
  };
  const blockStore: BlockQueryStore = {
    getAllBlocks: async () => deriveBlockIndex(journal),
  };
  return new QueryService(
    inMemoryEventStore(journal.records),
    noteStore,
    blockStore,
    bundledEffortStore,
  );
}
