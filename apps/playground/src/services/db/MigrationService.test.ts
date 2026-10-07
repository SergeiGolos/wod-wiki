import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'bun:test';
import { InMemoryStorage, resetStorageForTesting, setStorageForTesting, storageService } from '@/services/storage';
import { migrationService } from './MigrationService';

const FLAG = 'wodwiki:migrated-to-idb-v4';
const KEY = 'wodwiki:history:legacy-run';
const legacy = {
  id: 'legacy-run', title: 'Legacy run', rawContent: '# Preserved',
  createdAt: 100, updatedAt: 200,
  results: {
    startTime: 110, endTime: 180, duration: 70, completed: false,
    logs: [{ id: 1, outputType: 'segment', metrics: [{ type: 'rep', value: 21, origin: 'runtime' }] }],
  },
};

beforeEach(() => {
  localStorage.removeItem(FLAG);
  localStorage.setItem(KEY, JSON.stringify(legacy));
  setStorageForTesting(new InMemoryStorage());
});
afterEach(() => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(FLAG);
  resetStorageForTesting();
});

it('migrates inline Sessions logs and preserves run timing and completion', async () => {
  await migrationService.runMigration();
  expect(await storageService.getNote(legacy.id)).toMatchObject({ title: legacy.title });
  expect((await storageService.getLatestSegmentsForNote(legacy.id)).map(s => s.rawContent)).toEqual([legacy.rawContent]);
  expect(await storageService.getSessionsForNote(legacy.id)).toMatchObject([
    { startTime: 110, endTime: 180, duration: 70, completed: false },
  ]);
  const events = await storageService.getEventsForNote(legacy.id);
  expect(events.map(e => e.metrics.map(m => m.value))).toContainEqual([21]);
  expect(localStorage.getItem(FLAG)).toBe('true');
});

it('rolls back a failed entry and allows an idempotent retry', async () => {
  const inner = new InMemoryStorage();
  let fail = true;
  setStorageForTesting({
    readonly: store => inner.readonly(store),
    readwrite: store => inner.readwrite(store),
    transaction: (stores, mode, fn) => inner.transaction(stores, mode, async tx => {
      const result = await fn(tx);
      if (fail) throw new Error('migration write failed');
      return result;
    }),
    wipe: () => inner.wipe(), close: () => inner.close(),
  });
  await expect(migrationService.runMigration()).rejects.toBeInstanceOf(AggregateError);
  expect(await storageService.getNote(legacy.id)).toBeUndefined();
  expect(await storageService.getSessionsForNote(legacy.id)).toEqual([]);
  expect(localStorage.getItem(FLAG)).toBeNull();
  fail = false;
  await migrationService.runMigration();
  await migrationService.runMigration();
  expect((await storageService.getSessionsForNote(legacy.id)).map(s => s.duration)).toEqual([70]);
  expect((await storageService.getLatestSegmentsForNote(legacy.id)).map(s => s.rawContent)).toEqual([legacy.rawContent]);
});

it('continues after corrupt history while retaining the retry gate', async () => {
  localStorage.removeItem(KEY);
  localStorage.setItem('wodwiki:history:corrupt', '{');
  localStorage.setItem(KEY, JSON.stringify(legacy));
  try {
    await expect(migrationService.runMigration()).rejects.toBeInstanceOf(AggregateError);
    expect(await storageService.getNote(legacy.id)).toMatchObject({ title: legacy.title });
    expect(localStorage.getItem(FLAG)).toBeNull();
    localStorage.removeItem('wodwiki:history:corrupt');
    await migrationService.runMigration();
    expect((await storageService.getSessionsForNote(legacy.id)).map(s => s.duration)).toEqual([70]);
  } finally {
    localStorage.removeItem('wodwiki:history:corrupt');
  }
});
