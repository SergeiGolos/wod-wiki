/**
 * Effort Registry — Test Fixtures
 *
 * Deterministic mock effort sets for unit and integration tests.
 * Covers common test scenarios: running, strength, low MET, high MET,
 * user-derived efforts, and synthetic unresolved.
 *
 * @see PRD-EFFORT-REGISTRY Developer Story
 */

import type { IEffort } from './types';

export const fixtureRunning: IEffort = {
  id: 'fixture-running',
  slug: 'running-6-mph',
  label: 'Running (6 mph)',
  aliases: ['run', 'jogging', 'treadmill'],
  baseAttributes: { met: 9.8, discipline: 'running', intensityTier: 'moderate' },
  registrySource: 'bundled',
};

export const fixtureRowing: IEffort = {
  id: 'fixture-rowing',
  slug: 'rowing',
  label: 'Rowing',
  aliases: ['row', 'rower', 'erg'],
  baseAttributes: { met: 7.0, discipline: 'rowing', intensityTier: 'high' },
  registrySource: 'bundled',
};

export const fixtureBackSquat: IEffort = {
  id: 'fixture-back-squat',
  slug: 'back-squat',
  label: 'Back Squat',
  aliases: ['squat', 'barbell squat', 'bs'],
  baseAttributes: { met: 6.0, discipline: 'strength', intensityTier: 'moderate' },
  registrySource: 'bundled',
};

export const fixtureBurpee: IEffort = {
  id: 'fixture-burpee',
  slug: 'burpee',
  label: 'Burpee',
  aliases: ['burpees'],
  baseAttributes: { met: 10.0, discipline: 'bodyweight', intensityTier: 'high' },
  registrySource: 'bundled',
};

export const fixturePlank: IEffort = {
  id: 'fixture-plank',
  slug: 'plank',
  label: 'Plank',
  aliases: ['planks'],
  baseAttributes: { met: 3.5, discipline: 'bodyweight', intensityTier: 'low' },
  registrySource: 'bundled',
};

export const fixtureUserCustom: IEffort = {
  id: 'fixture-user-custom',
  slug: 'my-custom-hiit',
  label: 'My Custom HIIT Circuit',
  aliases: ['hiit', 'custom circuit'],
  baseAttributes: { met: 8.5, discipline: 'strength', intensityTier: 'high' },
  registrySource: 'user',
  derivation: {
    parentSlug: 'burpee',
    coefficients: { met: 1.2 },
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

/** A user effort that overrides a bundled effort by slug collision */
export const fixtureUserOverride: IEffort = {
  id: 'fixture-user-override',
  slug: 'rowing',
  label: 'Rowing (Calibrated)',
  aliases: ['row', 'rower', 'erg'],
  baseAttributes: { met: 8.5, discipline: 'rowing', intensityTier: 'high' },
  registrySource: 'user',
  createdAt: '2024-02-01T08:00:00Z',
  updatedAt: '2024-02-01T08:00:00Z',
};

/** Common bundled fixture set — covers running, rowing, strength, bodyweight, low MET */
export const commonFixtureSet: readonly IEffort[] = [
  fixtureRunning,
  fixtureRowing,
  fixtureBackSquat,
  fixtureBurpee,
  fixturePlank,
];

/** Full fixture set including user efforts */
export const fullFixtureSet: readonly IEffort[] = [
  ...commonFixtureSet,
  fixtureUserCustom,
  fixtureUserOverride,
];
