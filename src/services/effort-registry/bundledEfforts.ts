import type { EffortRecord } from './types';

const SEEDED_AT = '2026-05-20T00:00:00.000Z';

function bundledEffort(
  slug: string,
  label: string,
  aliases: string[],
  discipline: string,
  modality: string,
  met: number,
  intensityTier: EffortRecord['intensityTier'],
  description?: string,
): EffortRecord {
  return {
    id: `bundled-${slug}`,
    slug,
    label,
    aliases,
    description,
    discipline,
    modality,
    intensityTier,
    baseAttributes: {
      met,
      discipline,
      modality,
    },
    visibility: 'bundled',
    registrySource: 'bundled',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}

export const BUNDLED_EFFORTS: readonly EffortRecord[] = [
  bundledEffort('rowing', 'Rowing', ['row', 'erg', 'concept2 row', 'rowing machine'], 'rowing', 'cardio', 7, 'hard'),
  bundledEffort('running', 'Running', ['run', 'jog', 'treadmill run'], 'running', 'cardio', 9.8, 'hard'),
  bundledEffort('walking', 'Walking', ['walk', 'stroll', 'brisk walk'], 'walking', 'cardio', 3.5, 'easy'),
  bundledEffort('assault-bike', 'Assault Bike', ['bike erg', 'echo bike', 'air bike', 'assault bike'], 'cycling', 'machine', 8.5, 'hard'),
  bundledEffort('cycling-moderate', 'Cycling (Moderate)', ['cycle', 'bike', 'stationary bike'], 'cycling', 'cardio', 8, 'moderate'),
  bundledEffort('jump-rope', 'Jump Rope', ['rope', 'double unders', 'single unders'], 'conditioning', 'bodyweight', 12.3, 'hard'),
  bundledEffort('burpee', 'Burpee', ['burpees'], 'conditioning', 'bodyweight', 10, 'hard'),
  bundledEffort('kettlebell-swing', 'Kettlebell Swing', ['kb swing', 'kbs', 'swing'], 'strength', 'load', 9.5, 'moderate'),
  bundledEffort('thruster', 'Thruster', ['barbell thruster', 'dumbbell thruster'], 'strength', 'load', 8.8, 'hard'),
  bundledEffort('wall-ball', 'Wall Ball', ['wall ball shot', 'wallball', 'wall balls'], 'conditioning', 'load', 8, 'moderate'),
  bundledEffort('box-jump', 'Box Jump', ['box jumps', 'jump onto box'], 'conditioning', 'bodyweight', 8.8, 'moderate'),
  bundledEffort('ski-erg', 'Ski Erg', ['ski erg', 'ski', 'erg ski'], 'skiing', 'machine', 7.5, 'moderate'),
];
