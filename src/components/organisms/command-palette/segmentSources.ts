/**
 * segmentSources — PaletteDataSource instances for the WOD statement builder.
 * Lives in src/ so both the note editor and the playground can use it.
 */

import type { PaletteDataSource, PaletteItem } from './palette-types';

export type SegmentType = 'reps' | 'movement' | 'weight';

const SUGGESTIONS: Record<SegmentType, PaletteItem[]> = {
  reps: [
    { id: '5',  label: '5 reps',  category: 'Reps', type: 'statement-part', payload: '5' },
    { id: '10', label: '10 reps', category: 'Reps', type: 'statement-part', payload: '10' },
    { id: '15', label: '15 reps', category: 'Reps', type: 'statement-part', payload: '15' },
    { id: '20', label: '20 reps', category: 'Reps', type: 'statement-part', payload: '20' },
    { id: '21', label: '21 reps', category: 'Reps', type: 'statement-part', payload: '21' },
  ],
  movement: [
    { id: 'kbs',    label: 'Kettlebell Swings',  category: 'Movement', type: 'statement-part', payload: 'Kettlebell Swings' },
    { id: 'goblet', label: 'Goblet Squats',       category: 'Movement', type: 'statement-part', payload: 'Goblet Squats' },
    { id: 'press',  label: 'Overhead Press',      category: 'Movement', type: 'statement-part', payload: 'Overhead Press' },
    { id: 'snatch', label: 'Kettlebell Snatch',   category: 'Movement', type: 'statement-part', payload: 'Kettlebell Snatch' },
    { id: 'row',    label: 'Bent-over Row',       category: 'Movement', type: 'statement-part', payload: 'Bent-over Row' },
    { id: 'pullup', label: 'Pull-up',             category: 'Movement', type: 'statement-part', payload: 'Pull-up' },
    { id: 'burpee', label: 'Burpee',              category: 'Movement', type: 'statement-part', payload: 'Burpee' },
  ],
  weight: [
    { id: '16kg', label: '16 kg', category: 'Weight', type: 'statement-part', payload: '16kg' },
    { id: '20kg', label: '20 kg', category: 'Weight', type: 'statement-part', payload: '20kg' },
    { id: '24kg', label: '24 kg', category: 'Weight', type: 'statement-part', payload: '24kg' },
    { id: '32kg', label: '32 kg', category: 'Weight', type: 'statement-part', payload: '32kg' },
  ],
};

export function segmentSource(segmentType: SegmentType): PaletteDataSource {
  return {
    id: `segment:${segmentType}`,
    label: segmentType.charAt(0).toUpperCase() + segmentType.slice(1),
    search: async (query) => {
      const items = SUGGESTIONS[segmentType];
      if (!query) return items;
      const low = query.toLowerCase();
      return items.filter(s => s.label.toLowerCase().includes(low));
    },
  };
}
