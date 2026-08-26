/**
 * Dialects Module
 *
 * This module provides dialect implementations for recognizing
 * domain-specific workout patterns and emitting semantic hints.
 *
 * Available dialects:
 * - UnitsDialect    — Base unit fusion (Distance, Resistance, etc.)
 * - CrossFitDialect — AMRAP, EMOM, FOR TIME, TABATA patterns
 * - WodDialect      — STRENGTH, METCON, SKILLS, WOD, SUPERSET patterns
 * - CardioDialect   — RUN, ROW, BIKE, SWIM, WALK and distance-based patterns
 * - YogaDialect     — poses, flows, breathing, meditation patterns
 * - HabitsDialect   — daily habits, streaks, check-offs, recurring items
 * - ClimbDialect    — climbing grades, send types, attempts, route logs
 */

export { UnitsDialect } from './UnitsDialect';
export { CrossFitDialect } from './CrossFitDialect';
export { WodDialect } from './WodDialect';
export { CardioDialect } from './CardioDialect';
export { YogaDialect } from './YogaDialect';
export { HabitsDialect } from './HabitsDialect';
export { ClimbDialect, ClimbMetricType, type ClimbGradeSystem, type ClimbGradeMetricValue } from './ClimbDialect';
export { DialectStack, dialectStack, dialectRegistry, createDialectStack } from './DialectStack';
export { fuseUnits, fuseUnitsInMetrics } from './units/fuseUnits';
