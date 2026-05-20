import type { IEffort } from '../types';

/**
 * Bundled Effort Seed — Core Catalog
 *
 * Shipped with the app as the default effort catalog.
 * MET values are approximate and sourced from Compendium of Physical Activities.
 *
 * @see PRD-EFFORT-REGISTRY Appendix: Sample Bundled Effort Set
 */
export const bundledEfforts: readonly IEffort[] = [
  // Rowing
  {
    id: 'effort-bundled-rowing',
    slug: 'rowing',
    label: 'Rowing',
    aliases: ['row', 'rower', 'rowing machine', 'erg', 'ergometer', 'concept2 row'],
    baseAttributes: { met: 7.0, discipline: 'rowing', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-rowing-sprint',
    slug: 'rowing-sprint',
    label: 'Rowing (Sprint)',
    aliases: ['sprint row', 'rowing sprint', 'fast rowing'],
    baseAttributes: { met: 12.0, discipline: 'rowing', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Running
  {
    id: 'effort-bundled-running-6mph',
    slug: 'running-6-mph',
    label: 'Running (6 mph)',
    aliases: ['run', 'jogging', 'treadmill', 'easy run', 'jog'],
    baseAttributes: { met: 9.8, discipline: 'running', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-running-8mph',
    slug: 'running-8-mph',
    label: 'Running (8 mph)',
    aliases: ['running fast', 'fast run', 'speed run'],
    baseAttributes: { met: 11.8, discipline: 'running', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-running-sprint',
    slug: 'running-sprint',
    label: 'Running (Sprint)',
    aliases: ['sprint', 'all-out run', 'max speed run'],
    baseAttributes: { met: 14.5, discipline: 'running', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Walking
  {
    id: 'effort-bundled-walking-3mph',
    slug: 'walking-3-mph',
    label: 'Walking (3 mph)',
    aliases: ['walk', 'stroll', 'easy walk', 'brisk walk'],
    baseAttributes: { met: 2.8, discipline: 'walking', intensityTier: 'low' },
    registrySource: 'bundled',
  },

  // Cycling
  {
    id: 'effort-bundled-cycling-moderate',
    slug: 'cycling-moderate',
    label: 'Cycling (Moderate)',
    aliases: ['cycle', 'bike', 'stationary bike', 'spin', 'biking'],
    baseAttributes: { met: 8.0, discipline: 'cycling', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-cycling-vigorous',
    slug: 'cycling-vigorous',
    label: 'Cycling (Vigorous)',
    aliases: ['vigorous cycling', 'fast bike', 'hard cycling'],
    baseAttributes: { met: 10.0, discipline: 'cycling', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Strength — Barbell
  {
    id: 'effort-bundled-back-squat',
    slug: 'back-squat',
    label: 'Back Squat',
    aliases: ['squat', 'barbell squat', 'bs'],
    baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-front-squat',
    slug: 'front-squat',
    label: 'Front Squat',
    aliases: ['fs', 'front squat'],
    baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-deadlift',
    slug: 'deadlift',
    label: 'Deadlift',
    aliases: ['dl', 'dead lift', 'conventional deadlift'],
    baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-bench-press',
    slug: 'bench-press',
    label: 'Bench Press',
    aliases: ['bench', 'bp', 'chest press'],
    baseAttributes: { met: 5.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-overhead-press',
    slug: 'overhead-press',
    label: 'Overhead Press',
    aliases: ['ohp', 'press', 'shoulder press', 'military press'],
    baseAttributes: { met: 5.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-power-clean',
    slug: 'power-clean',
    label: 'Power Clean',
    aliases: ['clean', 'pc', 'hang clean'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-power-snatch',
    slug: 'power-snatch',
    label: 'Power Snatch',
    aliases: ['snatch', 'ps', 'hang snatch'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Strength — Olympic / Compound
  {
    id: 'effort-bundled-clean-and-jerk',
    slug: 'clean-and-jerk',
    label: 'Clean and Jerk',
    aliases: ['c\u0026j', 'clean jerk', 'clean \u0026 jerk'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-thruster',
    slug: 'thruster',
    label: 'Thruster',
    aliases: ['thrusters', 'barbell thruster'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Kettlebell
  {
    id: 'effort-bundled-kettlebell-swing',
    slug: 'kettlebell-swing',
    label: 'Kettlebell Swing',
    aliases: ['kb swing', 'kettlebell swings', 'swing', 'russian swing'],
    baseAttributes: { met: 9.8, discipline: 'kettlebell', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-kettlebell-snatch',
    slug: 'kettlebell-snatch',
    label: 'Kettlebell Snatch',
    aliases: ['kb snatch', 'kettlebell snatches', 'kb'],
    baseAttributes: { met: 12.0, discipline: 'kettlebell', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-kettlebell-clean',
    slug: 'kettlebell-clean',
    label: 'Kettlebell Clean',
    aliases: ['kb clean', 'kettlebell cleans'],
    baseAttributes: { met: 8.0, discipline: 'kettlebell', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-turkish-get-up',
    slug: 'turkish-get-up',
    label: 'Turkish Get-Up',
    aliases: ['tgu', 'turkish getup', 'get up'],
    baseAttributes: { met: 5.0, discipline: 'kettlebell', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },

  // Bodyweight / Gymnastics
  {
    id: 'effort-bundled-burpee',
    slug: 'burpee',
    label: 'Burpee',
    aliases: ['burpees', 'chest-to-floor burpee'],
    baseAttributes: { met: 10.0, discipline: 'bodyweight', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-pull-up',
    slug: 'pull-up',
    label: 'Pull-Up',
    aliases: ['pullup', 'pull ups', 'strict pull-up', 'kipping pull-up'],
    baseAttributes: { met: 5.0, discipline: 'gymnastics', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-push-up',
    slug: 'push-up',
    label: 'Push-Up',
    aliases: ['pushup', 'push ups', 'strict push-up'],
    baseAttributes: { met: 4.0, discipline: 'gymnastics', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-handstand-push-up',
    slug: 'handstand-push-up',
    label: 'Handstand Push-Up',
    aliases: ['hspu', 'handstand pushup', 'wall walk hspu'],
    baseAttributes: { met: 6.0, discipline: 'gymnastics', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-muscle-up',
    slug: 'muscle-up',
    label: 'Muscle-Up',
    aliases: ['mu', 'muscle up', 'ring muscle-up', 'bar muscle-up'],
    baseAttributes: { met: 8.0, discipline: 'gymnastics', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-air-squat',
    slug: 'air-squat',
    label: 'Air Squat',
    aliases: ['air squat', 'bodyweight squat', 'squats'],
    baseAttributes: { met: 5.5, discipline: 'bodyweight', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-box-jump',
    slug: 'box-jump',
    label: 'Box Jump',
    aliases: ['box jumps', 'jump to box', 'box'],
    baseAttributes: { met: 8.0, discipline: 'bodyweight', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-double-under',
    slug: 'double-under',
    label: 'Double-Under',
    aliases: ['du', 'double under', 'double unders', 'jump rope du'],
    baseAttributes: { met: 12.0, discipline: 'gymnastics', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-wall-ball',
    slug: 'wall-ball',
    label: 'Wall Ball',
    aliases: ['wb', 'wallball', 'wall balls'],
    baseAttributes: { met: 8.0, discipline: 'bodyweight', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-lunge',
    slug: 'lunge',
    label: 'Lunge',
    aliases: ['lunges', 'walking lunge', 'reverse lunge', 'forward lunge'],
    baseAttributes: { met: 4.0, discipline: 'bodyweight', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-dip',
    slug: 'dip',
    label: 'Dip',
    aliases: ['dips', 'ring dip', 'bar dip', 'parallel bar dip'],
    baseAttributes: { met: 4.0, discipline: 'gymnastics', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-toes-to-bar',
    slug: 'toes-to-bar',
    label: 'Toes-to-Bar',
    aliases: ['ttb', 'toes to bar', 'knees to elbows', 'kte'],
    baseAttributes: { met: 5.0, discipline: 'gymnastics', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },

  // Cardio Machines
  {
    id: 'effort-bundled-assault-bike',
    slug: 'assault-bike',
    label: 'Assault Bike',
    aliases: ['ab', 'air bike', 'fan bike', 'echo bike', 'assaultbike'],
    baseAttributes: { met: 10.0, discipline: 'cycling', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-ski-erg',
    slug: 'ski-erg',
    label: 'Ski Erg',
    aliases: ['ski', 'skiing', 'ski machine', 'concept2 ski'],
    baseAttributes: { met: 8.0, discipline: 'rowing', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Jump Rope
  {
    id: 'effort-bundled-jump-rope',
    slug: 'jump-rope',
    label: 'Jump Rope',
    aliases: ['jumprope', 'skipping', 'skip rope', 'rope skip'],
    baseAttributes: { met: 10.0, discipline: 'gymnastics', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Mobility / Core
  {
    id: 'effort-bundled-plank',
    slug: 'plank',
    label: 'Plank',
    aliases: ['planks', 'forearm plank', 'high plank'],
    baseAttributes: { met: 3.5, discipline: 'bodyweight', intensityTier: 'low' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-sit-up',
    slug: 'sit-up',
    label: 'Sit-Up',
    aliases: ['situp', 'sit ups', 'abmat sit-up', 'ghd sit-up'],
    baseAttributes: { met: 3.5, discipline: 'bodyweight', intensityTier: 'low' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-russian-twist',
    slug: 'russian-twist',
    label: 'Russian Twist',
    aliases: ['twist', 'russian twists'],
    baseAttributes: { met: 3.5, discipline: 'bodyweight', intensityTier: 'low' },
    registrySource: 'bundled',
  },

  // Swimming
  {
    id: 'effort-bundled-swimming',
    slug: 'swimming',
    label: 'Swimming',
    aliases: ['swim', 'pool swim', 'freestyle'],
    baseAttributes: { met: 8.0, discipline: 'swimming', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-swimming-vigorous',
    slug: 'swimming-vigorous',
    label: 'Swimming (Vigorous)',
    aliases: ['vigorous swim', 'fast swimming', 'butterfly'],
    baseAttributes: { met: 10.0, discipline: 'swimming', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Ballistic / Throws
  {
    id: 'effort-bundled-medicine-ball-clean',
    slug: 'medicine-ball-clean',
    label: 'Medicine Ball Clean',
    aliases: ['mb clean', 'medball clean', 'ball clean'],
    baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-slam-ball',
    slug: 'slam-ball',
    label: 'Slam Ball',
    aliases: ['ball slam', 'slamball', 'medball slam'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Pulling / Carrying
  {
    id: 'effort-bundled-sled-push',
    slug: 'sled-push',
    label: 'Sled Push',
    aliases: ['sled', 'prowler push', 'sled drag', ' prowler'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-farmer-carry',
    slug: 'farmer-carry',
    label: 'Farmer Carry',
    aliases: ['farmers carry', 'farmer walk', 'loaded carry'],
    baseAttributes: { met: 5.0, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
  },

  // CrossFit Named Movements
  {
    id: 'effort-bundled-devils-press',
    slug: 'devils-press',
    label: "Devil's Press",
    aliases: ['devils press', 'devil press', 'db devils press'],
    baseAttributes: { met: 10.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-man-maker',
    slug: 'man-maker',
    label: 'Man Maker',
    aliases: ['manmakers', 'db man maker', 'dumbbell man maker'],
    baseAttributes: { met: 10.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-cluster',
    slug: 'cluster',
    label: 'Cluster',
    aliases: ['clusters', 'squat clean thruster'],
    baseAttributes: { met: 10.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Dumbbell
  {
    id: 'effort-bundled-dumbbell-snatch',
    slug: 'dumbbell-snatch',
    label: 'Dumbbell Snatch',
    aliases: ['db snatch', 'dumbbell snatches', 'single-arm snatch'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-dumbbell-clean',
    slug: 'dumbbell-clean',
    label: 'Dumbbell Clean',
    aliases: ['db clean', 'dumbbell cleans'],
    baseAttributes: { met: 7.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-dumbbell-thruster',
    slug: 'dumbbell-thruster',
    label: 'Dumbbell Thruster',
    aliases: ['db thruster', 'dumbbell thrusters'],
    baseAttributes: { met: 8.0, discipline: 'strength', intensityTier: 'high' },
    registrySource: 'bundled',
  },

  // Recovery / Low Intensity
  {
    id: 'effort-bundled-rest',
    slug: 'rest',
    label: 'Rest',
    aliases: ['recovery', 'break', 'pause'],
    baseAttributes: { met: 1.0, discipline: 'recovery', intensityTier: 'low' },
    registrySource: 'bundled',
  },
  {
    id: 'effort-bundled-stretching',
    slug: 'stretching',
    label: 'Stretching',
    aliases: ['stretch', 'flexibility', 'mobility'],
    baseAttributes: { met: 2.3, discipline: 'recovery', intensityTier: 'low' },
    registrySource: 'bundled',
  },
] as const;

/** Number of bundled efforts shipped with the app */
export const BUNDLED_EFFORT_COUNT = bundledEfforts.length;
