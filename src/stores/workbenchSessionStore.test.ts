/**
 * workbenchSessionStore.test.ts — non-React test for the Workbench Session.
 *
 * Per Step 4 of Finding 01's implementation handoff: drive the store
 * through its factory with in-memory collaborators; assert the bucket
 * migrations (S1a–S1d) and the reactive observer seams (S2) without
 * rendering React.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { createWorkbenchSessionStore } from './workbenchSessionStore';
import type { INowProvider } from '@/runtime/INowProvider';
import type { INotePersistence } from '@/services/persistence';
import type { NoteMutation, NoteLocator, GetNoteOptions } from '@/services/persistence';
import type { HistoryEntry } from '@/types/history';
import type { WorkoutResults, StoredOutputStatement } from '@/components/Editor/types';
import type { Attachment } from '@/types/storage';
import type {
  IContentProvider,
  ContentProviderMode,
  NoteSaveInput,
  AttachmentCreateInput,
} from '@/types/content-provider';

/* ─── Mocks ────────────────────────────────────────────────────────────── */

class FakeNotePersistence implements INotePersistence {
  public readonly mutated: Array<{ locator: NoteLocator; mutation: NoteMutation }> = [];
  private readonly notes = new Map<string, HistoryEntry>();

  async getNote(locator: NoteLocator, _options?: GetNoteOptions): Promise<HistoryEntry> {
    const id = String(locator);
    const note = this.notes.get(id);
    if (!note) throw new Error(`note not found: ${id}`);
    return note;
  }

  async listNotes() {
    return Array.from(this.notes.values());
  }

  async mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry> {
    this.mutated.push({ locator, mutation });
    const id = String(locator);
    const existing = this.notes.get(id);
    if (!existing) throw new Error(`note not found: ${id}`);
    return existing;
  }

  async deleteNote() {
    /* no-op */
  }

  seed(note: HistoryEntry) {
    this.notes.set(note.id, note);
  }
}

class FakeContentProvider implements IContentProvider {
  readonly mode: ContentProviderMode = 'history';
  readonly capabilities = {
    canWrite: true,
    canDelete: true,
    canFilter: false,
    canMultiSelect: false,
    supportsHistory: true,
  } as const;
  public readonly updated: Array<{ id: string; rawContent?: string; title?: string }> = [];
  private entries = new Map<string, HistoryEntry>();

  async getEntries() {
    return Array.from(this.entries.values());
  }
  async getEntry(id: string) {
    return this.entries.get(id) ?? null;
  }
  async getAttachments(_noteId: string) {
    return [];
  }
  async saveEntry(input: NoteSaveInput): Promise<HistoryEntry> {
    const id = input.id ?? 'saved';
    const entry = { ...input, id, type: 'note' } as HistoryEntry;
    this.entries.set(id, entry);
    return entry;
  }
  async updateEntry(
    id: string,
    patch: { rawContent?: string; title?: string; tags?: string[] },
  ): Promise<HistoryEntry> {
    this.updated.push({ id, ...patch });
    const existing = this.entries.get(id);
    const next = existing
      ? { ...existing, ...patch }
      : ({ ...patch, id, type: 'note' } as HistoryEntry);
    this.entries.set(id, next);
    return next;
  }
  async cloneEntry(sourceId: string, _targetDate?: number): Promise<HistoryEntry> {
    const existing = this.entries.get(sourceId);
    if (!existing) throw new Error(`clone failed: ${sourceId} not found`);
    return { ...existing, id: `${sourceId}-clone` };
  }
  async deleteEntry(_id: string): Promise<void> {
    /* no-op */
  }
  async saveAttachment(
    _noteId: string,
    _attachment: AttachmentCreateInput,
  ): Promise<Attachment> {
    throw new Error('not used in tests');
  }
  async deleteAttachment(_id: string): Promise<void> {
    /* no-op */
  }
  seed(note: HistoryEntry) {
    this.entries.set(note.id, note);
  }
}

function frozenClock(atIso: string): INowProvider {
  const at = new Date(atIso);
  return { now: () => at, nowMs: () => at.getTime() };
}

function fakeTimers() {
  const slots: Array<{ fn: (() => void) | null }> = [];
  const setTimeoutFn = (handler: () => void, _ms: number) => {
    const slot: { fn: (() => void) | null } = { fn: handler };
    slots.push(slot);
    return slots.length - 1;
  };
  const clearTimeoutFn = (handle: unknown) => {
    const idx = typeof handle === 'number' ? handle : -1;
    if (idx >= 0 && idx < slots.length) slots[idx].fn = null;
  };
  return {
    slots,
    setTimeoutFn,
    clearTimeoutFn,
    getLiveCount: () => slots.filter((s) => s.fn !== null).length,
    fireFirst: () => {
      const slot = slots.find((s) => s.fn !== null);
      if (slot?.fn) slot.fn();
    },
  };
}

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'note-1',
    title: 'Test',
    tags: [],
    rawContent: '',
    createdAt: Date.parse('2026-01-01T00:00:00Z'),
    updatedAt: Date.parse('2026-01-01T00:00:00Z'),
    targetDate: Date.parse('2026-01-01T00:00:00Z'),
    schemaVersion: 1,
    ...overrides,
  };
}

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('workbenchSessionStore', () => {
  let notePersistence: FakeNotePersistence;
  let provider: FakeContentProvider;
  let timer: ReturnType<typeof fakeTimers>;
  let now: INowProvider;
  let intents: unknown[];

  beforeEach(() => {
    notePersistence = new FakeNotePersistence();
    provider = new FakeContentProvider();
    timer = fakeTimers();
    now = frozenClock('2026-01-01T00:00:00Z');
    intents = [];
  });

  it('setContent derives sections + blocks from content', () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: (i) => intents.push(i),
    });

    store.getState().setContent('');
    expect(store.getState().sections).toEqual([]);
    expect(store.getState().blocks).toEqual([]);

    store.getState().setContent('# Title\n\n```wod\nFran\n21-15-9\n```\n');
    expect(store.getState().sections?.length ?? 0).toBeGreaterThan(0);
    expect(store.getState().blocks.length).toBeGreaterThan(0);
  });

  it('setContent schedules a debounced autosave via the injected provider', () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    provider.seed(makeEntry({ id: 'note-1' }));
    expect(provider.updated.length).toBe(0);

    store.getState().setContent('# Title\n\n```wod\nbody\n```\n');
    expect(provider.updated.length).toBe(0);
    expect(timer.getLiveCount()).toBe(1);

    store.getState().setContent('# Title\n\n```wod\nbody v2\n```\n');
    store.getState().setContent('# Title\n\n```wod\nbody v3\n```\n');
    // Reschedule cancels the prior timer, so only the latest is live.
    expect(timer.getLiveCount()).toBe(1);

    timer.fireFirst();

    expect(provider.updated.length).toBe(1);
    expect(provider.updated[0].rawContent).toContain('body v3');
  });

  it('flushSave runs the provider immediately when the debounce is pending', async () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    provider.seed(makeEntry({ id: 'note-2' }));
    store.getState().setContent('# Title\n\n```wod\nunsaved\n```\n');
    expect(provider.updated.length).toBe(0);

    await store.getState().flushSave();
    expect(provider.updated.length).toBe(1);
  });

  it('completeWorkout calls mutateNote with analytics + emits a goToReview intent', async () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: (i) => intents.push(i),
    });

    const entry = makeEntry({ id: 'note-3' });
    notePersistence.seed(entry);
    store.setState({ currentEntry: entry });

    // Pre-seed analytics segments (the live runtime seam populates these).
    store.setState({
      analyticsSegments: [
        {
          id: 1,
          name: 'seg-1',
          type: 'segment',
          startTime: Date.parse('2026-01-01T00:00:00Z'),
          endTime: Date.parse('2026-01-01T00:01:00Z'),
          elapsed: 60,
          total: 60,
          parentId: null,
          depth: 0,
          metric: {},
          lane: 0,
        },
      ],
    });
    const result: WorkoutResults = {
      startTime: Date.parse('2026-01-01T00:00:00Z'),
      endTime: Date.parse('2026-01-01T00:01:00Z'),
      duration: 60_000,
      completed: true,
    };

    const resultId = await store.getState().completeWorkout(result);
    expect(resultId).toMatch(/^[0-9a-f-]+$/);

    expect(notePersistence.mutated.length).toBe(1);
    const call = notePersistence.mutated[0];
    expect(String(call.locator)).toBe('note-3');
    expect(call.mutation.workoutResult).toBeDefined();
    // `workoutResult.id` is the generated `resultId` (separate from
    // `WorkoutResults.startTime`/etc.); the session's `completeWorkout`
    // mints it and passes it through.
    expect(call.mutation.workoutResult?.id).toBe(resultId);
    expect(call.mutation.workoutResult?.analyticsSegments?.length).toBe(1);

    expect(intents.length).toBe(1);
    const intent = intents[0] as { type: string };
    expect(intent.type).toBe('goToReview');

    expect(store.getState().results.length).toBe(1);
    expect(store.getState().results[0]).toEqual(result);
  });
  it('loadEntry populates content + currentEntry', async () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    const entry = makeEntry({
      id: 'note-4',
      rawContent: '# Loaded Title\n\n```wod\nwod-A\n```\n',
    });
    notePersistence.seed(entry);

    const result = await store.getState().loadEntry({
      routeId: 'note-4',
      routeView: 'review',
      routeSectionId: undefined,
      routeResultId: undefined,
      initialActiveEntryId: undefined,
      propInitialContent: '',
    });
    expect(result).toBe(entry);

    const state = store.getState();
    expect(state.content).toContain('Loaded Title');
    expect(state.currentEntry).toEqual(entry);
    // loadEntry marks the content as already saved to avoid an immediate
    // autosave firing.
    expect(state.lastSavedContent).toBe(entry.rawContent);
  });

  it('feedLogOutputs derives analytics from persisted logs', () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    const logs: StoredOutputStatement[] = [
      {
        id: 1,
        outputType: 'segment',
        timeSpan: { started: Date.parse('2026-01-01T00:00:00Z') },
        spans: [{ started: Date.parse('2026-01-01T00:00:00Z') }],
        elapsed: 60_000,
        total: 60_000,
        metrics: [],
        sourceBlockKey: 'wod-1',
        stackLevel: 0,
      } satisfies StoredOutputStatement,
    ];

    store.getState().feedLogOutputs(logs, Date.parse('2026-01-01T00:00:00Z'));
    expect(store.getState().logOutputList).toBe(logs);
    expect(store.getState().analyticsSegments.length).toBeGreaterThan(0);
  });

  it('setViewMode + setSelectedBlockId update the session surface', () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    store.getState().setViewMode('track');
    store.getState().setSelectedBlockId('wod-1');

    const state = store.getState();
    expect(state.viewMode).toBe('track');
    expect(state.selectedBlockId).toBe('wod-1');
  });

  it('resetStore clears the entire session', () => {
    const store = createWorkbenchSessionStore({
      nowProvider: now,
      notePersistence,
      provider,
      setTimeout: timer.setTimeoutFn,
      clearTimeout: timer.clearTimeoutFn,
      navigate: () => undefined,
    });

    store.getState().setContent('# Title');
    store.getState().setViewMode('track');
    store.getState().setSelectedBlockId('wod-1');

    store.getState().resetStore();

    const state = store.getState();
    expect(state.content).toBe('');
    expect(state.viewMode).toBe('plan');
    expect(state.selectedBlockId).toBeNull();
    expect(state.blocks).toEqual([]);
  });

  it('factory accepts no collaborators and degrades gracefully', () => {
    // Default module-load factory — no provider, no persistence. `setContent`
    // still derives the document; `flushSave` is a no-op.
    const store = createWorkbenchSessionStore();

    store.getState().setContent('# Title\n\n```wod\nbody\n```\n');
    expect(store.getState().blocks.length).toBeGreaterThan(0);

    expect(() => store.getState().flushSave()).not.toThrow();
  });
});
