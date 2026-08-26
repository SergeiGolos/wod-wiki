/**
 * captureSessionRpe — post-workout RPE write path (#735).
 *
 * Appends a user-origin SessionRPE metric to a stored workout result's logs,
 * saves the result, and re-derives analytics so Tier-2 projections (e.g.
 * SessionLoad) reflect the user's authoritative rating.
 */
import type { StoredOutputStatement } from '@/components/Editor/types';
import { MetricType } from '@bitcobblers/wod-wiki-engine';
import { IndexedDBNotePersistence } from '@/services/persistence/IndexedDBNotePersistence';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { NotePersistenceError, type NotePersistenceStorage } from '@/services/persistence/types';

export type CaptureSessionRpeOutcome = 'captured' | 'captured-no-rederive' | 'not-found';

/**
 * Read the user-captured session RPE from a result's logs — the value written
 * by {@link captureSessionRpe}. Returns undefined when the run was never rated.
 */
export function readSessionRpe(logs: StoredOutputStatement[] | undefined): number | undefined {
  if (!logs) return undefined;
  for (const statement of logs) {
    if (statement.outputType !== 'segment') continue;
    const metric = statement.metrics.find(
      (m) => m.type === MetricType.SessionRPE && m.origin === 'user',
    );
    if (metric && typeof metric.value === 'number') return metric.value;
  }
  return undefined;
}

export interface CaptureSessionRpeDeps {
  storage?: NotePersistenceStorage;
  persistence?: IndexedDBNotePersistence;
}

export async function captureSessionRpe(
  resultId: string,
  rpe: number,
  deps: CaptureSessionRpeDeps = {},
): Promise<CaptureSessionRpeOutcome> {
  const storage = deps.storage ?? indexedDBService;
  const persistence = deps.persistence ?? new IndexedDBNotePersistence(storage);

  const result = await storage.getResultById(resultId);
  if (!result) {
    return 'not-found';
  }

  const previousLogs = result.data.logs ?? [];

  // Strip any existing user-origin SessionRPE metrics so a re-answer replaces
  // rather than duplicates. Drop segment statements that become empty.
  const cleanedLogs: StoredOutputStatement[] = [];
  for (const statement of previousLogs) {
    if (statement.outputType !== 'segment') {
      cleanedLogs.push(statement);
      continue;
    }
    const userRpeIndices = statement.metrics
      .map((m, i) => (m.type === MetricType.SessionRPE && m.origin === 'user' ? i : -1))
      .filter((i) => i >= 0);
    if (userRpeIndices.length === 0) {
      cleanedLogs.push(statement);
      continue;
    }
    const remainingMetrics = statement.metrics.filter((_, i) => !userRpeIndices.includes(i));
    if (remainingMetrics.length > 0) {
      cleanedLogs.push({ ...statement, metrics: remainingMetrics });
    }
  }

  // Anchor the new statement to the last real segment so the review grid keeps
  // a coherent block association, falling back to a synthetic session key.
  let sourceBlockKey = 'session';
  let stackLevel = 0;
  for (let i = cleanedLogs.length - 1; i >= 0; i--) {
    const log = cleanedLogs[i]!;
    if (log.outputType === 'segment') {
      sourceBlockKey = log.sourceBlockKey;
      stackLevel = log.stackLevel;
      break;
    }
  }

  let nextId = 1;
  for (const log of cleanedLogs) {
    if (typeof log.id === 'number' && log.id >= nextId) {
      nextId = log.id + 1;
    }
  }

  const ended = result.data.endTime ?? result.data.startTime ?? Date.now();

  const rpeStatement: StoredOutputStatement = {
    id: nextId,
    outputType: 'segment',
    timeSpan: { started: ended, ended },
    metrics: [
      {
        type: MetricType.SessionRPE,
        value: rpe,
        origin: 'user',
        image: `rpe: ${rpe}`,
      },
    ],
    sourceBlockKey,
    stackLevel,
  };

  const updatedResult = {
    ...result,
    data: { ...result.data, logs: [...cleanedLogs, rpeStatement] },
  };
  await storage.saveResult(updatedResult);

  try {
    await persistence.rederiveResultAnalytics(resultId);
    return 'captured';
  } catch (err) {
    if (err instanceof NotePersistenceError && err.code === 'SEGMENT_NOT_FOUND') {
      return 'captured-no-rederive';
    }
    throw err;
  }
}
