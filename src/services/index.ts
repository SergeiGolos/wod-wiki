/**
 * Services Module
 * 
 * This module provides centralized services for the WOD Wiki application.
 */

export { ExerciseDefinitionService } from '../repositories/workout/ExerciseDefinitionService';
export { workoutEventBus, type WorkoutEvent, type WorkoutEventSubscriber } from './WorkoutEventBus';
export { DialectRegistry } from './DialectRegistry';
