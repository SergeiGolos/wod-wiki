import { commonFixtureSet } from '../fixtures';
import type { IEffort } from '../types';

/** All bundled efforts — seeded with common fixture set for headless/standalone runtime */
export const bundledEfforts: readonly IEffort[] = commonFixtureSet;

/** Number of bundled efforts */
export const BUNDLED_EFFORT_COUNT = bundledEfforts.length;
