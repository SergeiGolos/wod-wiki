/**
 * Bundled Effort Seed — Core Catalog
 *
 * Shipped with the app as the default effort catalog.
 * Effort definitions are now sourced from markdown/efforts/ markdown files.
 *
 * @see PRD-EFFORT-REGISTRY Appendix: Sample Bundled Effort Set
 */

import { getBundledEfforts, getBundledEffortCount } from '@/repositories/effort-markdown';

/** All bundled efforts parsed from markdown/efforts/ */
export const bundledEfforts = getBundledEfforts();

/** Number of bundled efforts shipped with the app */
export const BUNDLED_EFFORT_COUNT = getBundledEffortCount();
