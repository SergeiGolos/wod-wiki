/**
 * wellness — user-captured wellness/inputs from ```wellness fences.
 *
 * The proposed dashboard metrics (`calc.soreness`, `calc.hrv`, `calc.sleep`,
 * `calc.readiness`, `calc.mvcBw`, `calc.ef`, `calc.adherence`) need raw
 * inputs that no workout run can produce: subjective morning check-ins and
 * test results. A ```wellness block in a note is the capture surface:
 *
 *   ```wellness
 *   soreness: 7
 *   sleep: 7.5h
 *   hrv: 62
 *   weight: 81kg
 *   hang: 30kg
 *   hr: 148bpm
 *   planned: 1
 *   ```
 *
 * On note save, `captureWellnessFacts` reconciles day-grain user facts
 * (`metricKey` = the raw key, e.g. `soreness`) for the note: writes new or
 * changed entries, deletes entries the block no longer carries. Store-scope
 * seeds (STORE_CALCS) then publish the `calc.*` rollup rows the dashboards
 * query — the `calc.* = engine-published` convention holds.
 *
 * Row ids are deterministic (`wellness:<noteId>:<key>`), so re-saves upsert
 * in place and deleting the block removes its facts. One wellness block per
 * day per note is the convention; multiple blocks in one note keep the LAST
 * entry per key.
 */
import type { AnalyticsDataPoint } from '@/types/storage';
import { DAY, dayBucket } from './rollup/workloadRollup';

/** Canonical wellness keys → unit expectations. Bare numbers use the default. */
const WELLNESS_KEYS: Record<string, { unit: string; label: string; min?: number; max?: number }> = {
  soreness: { unit: 'rating', label: 'Soreness', min: 1, max: 10 },
  sleep: { unit: 'h', label: 'Sleep' },
  hrv: { unit: 'ms', label: 'HRV' },
  weight: { unit: 'kg', label: 'Bodyweight' },
  hang: { unit: 'kg', label: 'Max Hang Weight' },
  hr: { unit: 'bpm', label: 'Avg Heart Rate' },
  planned: { unit: 'count', label: 'Planned Sessions' },
};

export interface WellnessEntry {
  key: string;
  value: number;
  unit: string;
  label: string;
}

/** Strip a trailing unit suffix (h, hr, ms, kg, lb, bpm, sessions) from a value token. */
function parseValueUnit(raw: string): { value: number; unit?: string } | undefined {
  const match = /^(-?\d+(?:\.\d+)?)\s*([a-z%]*)$/i.exec(raw.trim());
  if (!match) return undefined;
  return { value: parseFloat(match[1]), unit: match[2] || undefined };
}

/** Parse the INNER content of a wellness block (no fences) into entries. */
export function parseWellnessContent(content: string): WellnessEntry[] {
  const entries = new Map<string, WellnessEntry>();
  for (const line of content.split('\n')) {
    const match = /^([a-z][a-z0-9]*)\s*[:=]\s*(.+)$/i.exec(line.trim());
    if (!match) continue;
    const key = match[1].toLowerCase();
    const spec = WELLNESS_KEYS[key];
    if (!spec) continue; // unknown keys are ignored, not errors
    const parsed = parseValueUnit(match[2]);
    if (!parsed) continue;
    if (spec.min !== undefined && parsed.value < spec.min) continue;
    if (spec.max !== undefined && parsed.value > spec.max) continue;
    entries.set(key, { key, value: parsed.value, unit: parsed.unit ?? spec.unit, label: spec.label });
  }
  return [...entries.values()];
}

/** Extract every ```wellness block's entries from raw note content. */
export function extractWellnessEntries(rawContent: string): WellnessEntry[] {
  const entries = new Map<string, WellnessEntry>();
  const fence = /```wellness[^\S\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(rawContent)) !== null) {
    for (const entry of parseWellnessContent(match[1])) entries.set(entry.key, entry);
  }
  return [...entries.values()];
}

/**
 * Build the wellness fact rows for a note from its raw content. Timestamp is
 * the note's day (journal targetDate when known, else `now`).
 */
export function wellnessFactsForNote(
  noteId: string,
  rawContent: string,
  options: { targetDate?: number; now?: number } = {},
): AnalyticsDataPoint[] {
  const entries = extractWellnessEntries(rawContent);
  if (entries.length === 0) return [];
  const now = options.now ?? Date.now();
  const day = dayBucket(options.targetDate ?? now);
  return entries.map((entry) => ({
    id: wellnessFactId(noteId, entry.key),
    noteId,
    grain: 'summary' as const,
    segmentId: '',
    segmentVersion: 0,
    resultId: `wellness:${noteId}`,
    origin: 'user' as const,
    type: entry.key,
    value: entry.value,
    unit: entry.unit,
    label: entry.label,
    metricKey: entry.key,
    metricLabel: entry.label,
    metricUnit: entry.unit,
    timestamp: day * DAY,
    createdAt: now,
  }));
}

/** Deterministic wellness fact id — one row per key per note. */
export function wellnessFactId(noteId: string, key: string): string {
  return `wellness:${noteId}:${key}`;
}

/** The store surface wellness capture needs — injectable for tests. */
export interface WellnessFactStore {
  saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void>;
  deleteAnalyticsPoints(ids: string[]): Promise<void>;
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
}

/**
 * Reconcile a note's wellness facts with its content: upsert entries the
 * block carries, delete wellness rows for keys the block no longer carries.
 */
export async function captureWellnessFacts(
  noteId: string,
  rawContent: string,
  store: WellnessFactStore,
  options: { targetDate?: number; now?: number } = {},
): Promise<{ written: number; deleted: number }> {
  const desired = wellnessFactsForNote(noteId, rawContent, options);
  const desiredIds = new Set(desired.map((f) => f.id));

  // Existing wellness rows for this note (keyed by the wellness: id prefix).
  const existing = (
    await Promise.all(Object.keys(WELLNESS_KEYS).map((key) => store.getFactsByMetric(key)))
  )
    .flat()
    .filter((row) => row.id.startsWith(`wellness:${noteId}:`));

  const writes = desired.filter((row) => {
    const current = existing.find((e) => e.id === row.id);
    return !current || current.value !== row.value || current.timestamp !== row.timestamp;
  });
  const deletions = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id);

  if (writes.length > 0) await store.saveAnalyticsPoints(writes);
  if (deletions.length > 0) await store.deleteAnalyticsPoints(deletions);
  return { written: writes.length, deleted: deletions.length };
}
