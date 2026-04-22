/**
 * Dialects Module
 *
 * This module provides dialect implementations for recognizing
 * domain-specific workout patterns and emitting semantic hints.
 *
 * Available dialects:
 * - CrossFitDialect  — AMRAP, EMOM, FOR TIME, TABATA patterns
 * - WodDialect       — STRENGTH, METCON, SKILLS, WOD, SUPERSET patterns
 * - CardioDialect    — RUN, ROW, BIKE, SWIM, WALK and distance-based patterns
 * - YogaDialect      — poses, flows, breathing, meditation patterns
 * - HabitsDialect    — daily habits, streaks, check-offs, recurring items
 */

export { CrossFitDialect } from './CrossFitDialect';
export { WodDialect } from './WodDialect';
export { CardioDialect } from './CardioDialect';
export { YogaDialect } from './YogaDialect';
export { HabitsDialect } from './HabitsDialect';
