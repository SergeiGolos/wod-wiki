/**
 * Shared fixture data for DesignSystem stories.
 *
 * Import from this file in all DesignSystem story files so mock data
 * is defined once and reusable across every tier (atoms / molecules / organisms).
 */

import { MetricType, type IMetric } from '@/core/models/Metric';
import type { HistoryEntry } from '@/types/history';
import type { Notebook } from '@/types/notebook';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';

// ── Date helpers ────────────────────────────────────────────────────────────
const NOW = Date.now();
const DAY = 86_400_000;
const d = (daysAgo: number) => NOW - daysAgo * DAY;

// Convert to ISO date string for calendar fixtures
const toIso = (ts: number) => new Date(ts).toISOString().slice(0, 10);

// ── HistoryEntry fixtures ───────────────────────────────────────────────────
export const FIXTURE_ENTRIES: HistoryEntry[] = [
  {
    id: 'entry-fran',
    title: 'Fran',
    createdAt: d(7),
    updatedAt: d(7),
    targetDate: d(7),
    rawContent: '# Fran\n\n```wod\n(21-15-9)\n  Thrusters @95lb\n  Pull-ups\n```',
    tags: ['benchmark', 'crossfit'],
    schemaVersion: 1,
    type: 'note',
  },
  {
    id: 'entry-cindy',
    title: 'Cindy',
    createdAt: d(3),
    updatedAt: d(2),
    targetDate: d(3),
    rawContent: '# Cindy\n\n```wod\n20:00 AMRAP\n  5 Pull-ups\n  10 Push-ups\n  15 Air Squats\n```',
    tags: ['amrap', 'benchmark'],
    schemaVersion: 1,
    type: 'note',
  },
  {
    id: 'entry-ss',
    title: 'Simple & Sinister',
    createdAt: d(1),
    updatedAt: d(1),
    targetDate: d(0),
    rawContent:
      '# Simple & Sinister\n\n```wod\n10x\n  10 KB Swings @53lb\n  1:00 rest\n10x\n  1 TGU @53lb\n```',
    tags: ['kettlebell', 'strength'],
    schemaVersion: 1,
    type: 'note',
  },
  {
    id: 'entry-helen',
    title: 'Helen',
    createdAt: d(14),
    updatedAt: d(14),
    targetDate: d(14),
    rawContent:
      '# Helen\n\n```wod\n(3)\n  400m Run\n  21 KB Swings @53lb\n  12 Pull-ups\n```',
    tags: ['benchmark', 'template'],
    schemaVersion: 1,
    type: 'template',
  },
  {
    id: 'entry-emom',
    title: 'EMOM 10',
    createdAt: d(5),
    updatedAt: d(5),
    targetDate: d(5),
    rawContent: '# EMOM 10\n\n```wod\n10x 1:00\n  10 Thrusters @95lb\n```',
    tags: ['emom', 'conditioning'],
    schemaVersion: 1,
    type: 'note',
  },
];

// ── Notebook fixtures ───────────────────────────────────────────────────────
export const FIXTURE_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb-benchmarks',
    name: 'Benchmarks',
    description: 'Classic CrossFit benchmarks',
    icon: '🏆',
    createdAt: d(30),
    lastEditedAt: d(2),
  },
  {
    id: 'nb-strength',
    name: 'Strength',
    description: 'Barbell & kettlebell work',
    icon: '🏋️',
    createdAt: d(60),
    lastEditedAt: d(5),
  },
  {
    id: 'nb-cardio',
    name: 'Cardio',
    description: 'Running, rowing, biking',
    icon: '🏃',
    createdAt: d(45),
    lastEditedAt: d(10),
  },
];

// ── WodCollection fixtures ─────────────────────────────────────────────────
const makeItem = (
  id: string,
  name: string,
  content: string,
  collId: string,
): WodCollectionItem => ({ id, name, content, path: `${collId}/${id}.md` });

export const FIXTURE_COLLECTIONS: WodCollection[] = [
  {
    id: 'crossfit-benchmarks',
    name: 'CrossFit Benchmarks',
    count: 3,
    items: [
      makeItem(
        'fran',
        'Fran',
        '---\ncategory: CrossFit\ndifficulty: advanced\ndescription: The quintessential CrossFit benchmark — 21-15-9 thrusters and pull-ups.\n---\n(21-15-9)\n  Thrusters @95lb\n  Pull-ups',
        'crossfit-benchmarks',
      ),
      makeItem(
        'cindy',
        'Cindy',
        '---\ncategory: CrossFit\ndifficulty: intermediate\ndescription: 20-minute AMRAP of the classic bodyweight triplet.\n---\n20:00 AMRAP\n  5 Pull-ups\n  10 Push-ups\n  15 Air Squats',
        'crossfit-benchmarks',
      ),
      makeItem(
        'grace',
        'Grace',
        '---\ncategory: CrossFit\ndifficulty: advanced\ndescription: 30 clean & jerks for time — a true test of barbell cycling.\n---\n30 Clean & Jerk @135lb',
        'crossfit-benchmarks',
      ),
    ],
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell',
    count: 2,
    items: [
      makeItem(
        'simple-sinister',
        'Simple & Sinister',
        '---\ncategory: Strength\ndifficulty: beginner\ndescription: Pavel\'s daily kettlebell practice for strength and conditioning.\n---\n10x\n  10 KB Swings @53lb\n  1 TGU @53lb',
        'kettlebell',
      ),
      makeItem(
        'abc',
        'Armor Building Complex',
        '---\ncategory: Strength\ndifficulty: intermediate\ndescription: Triple complex for building bulletproof shoulders and grip.\n---\n(3)\n  2 KB Clean @53lb\n  1 KB Press @53lb\n  3 KB Front Squat @53lb',
        'kettlebell',
      ),
    ],
  },
];

// ── IMetric fixtures ────────────────────────────────────────────────────────
// Duration / Elapsed / Time values are in milliseconds (MetricPill formats them).
export const FIXTURE_METRICS: IMetric[] = [
  { type: MetricType.Elapsed, value: 132_000, unit: 's', origin: 'runtime' },
  { type: MetricType.Rep, value: 21, unit: 'reps', origin: 'compiler' },
  { type: 'weight', value: 95, unit: 'lb', origin: 'parser' },
  { type: MetricType.Duration, value: 180_000, unit: 's', origin: 'parser' },
  { type: MetricType.Elapsed, value: 95_000, unit: 's', origin: 'user' },
];

// ── Calendar entry-date set ─────────────────────────────────────────────────
export const FIXTURE_ENTRY_DATES: Set<string> = new Set(
  FIXTURE_ENTRIES.map(e => toIso(e.targetDate)),
);
