/**
 * Manual mock for effort-markdown to avoid import.meta.glob issues in tests
 */

import { vi } from 'vitest';
import type { IEffort } from '@/effort-registry/types';

const mockEfforts: IEffort[] = [
  {
    id: 'effort-bundled-rowing',
    slug: 'rowing',
    label: 'Rowing',
    aliases: ['row', 'rower', 'erg'],
    baseAttributes: { met: 7.0, discipline: 'rowing', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-burpee',
    slug: 'burpee',
    label: 'Burpee',
    aliases: ['burpees'],
    baseAttributes: { met: 10.0, discipline: 'bodyweight', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-kettlebell-snatch',
    slug: 'kettlebell-snatch',
    label: 'Kettlebell Snatch',
    aliases: ['kbs'],
    baseAttributes: { met: 12.0, discipline: 'kettlebell', intensityTier: 'high' },
    registrySource: 'bundled',
  },
];

export const getBundledEfforts = vi.fn((): readonly IEffort[] => mockEfforts);
export const getBundledEffortCount = vi.fn(() => mockEfforts.length);

export const __mockEfforts = mockEfforts;
