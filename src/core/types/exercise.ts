/**
 * Exercise types for WOD Wiki
 * 
 * Types and enums for exercise data including muscles, equipment,
 * categories, and the Exercise interface itself.
 */

/**
 * Muscle groups targeted by exercises
 */
export enum Muscle {
  abdominals = "abdominals",
  hamstrings = "hamstrings",
  calves = "calves",
  shoulders = "shoulders",
  adductors = "adductors",
  glutes = "glutes",
  quadriceps = "quadriceps",
  biceps = "biceps",
  forearms = "forearms",
  abductors = "abductors",
  triceps = "triceps",
  chest = "chest",
  lower_back = "lower back",
  traps = "traps",
  middle_back = "middle back",
  lats = "lats",
  neck = "neck",
}

/**
 * Force types for exercises
 */
export enum Force {
  pull = "pull",
  push = "push",
  static = "static",
}

/**
 * Difficulty levels for exercises
 */
export enum Level {
  beginner = "beginner",
  intermediate = "intermediate",
  expert = "expert",
}

/**
 * Exercise mechanics types
 */
export enum Mechanic {
  compound = "compound",
  isolation = "isolation",
}

/**
 * Equipment required for exercises
 */
export enum Equipment {
  body = "body only",
  machine = "machine",
  kettlebells = "kettlebells",
  dumbbell = "dumbbell",
  cable = "cable",
  barbell = "barbell",
  bands = "bands",
  medicine_ball = "medicine ball",
  exercise_ball = "exercise ball",
  e_z_curl_bar = "e-z curl bar",
  foam_roll = "foam roll",
}

/**
 * Exercise categories
 */
export enum Category {
  strength = "strength",
  stretching = "stretching",
  plyometrics = "plyometrics",
  strongman = "strongman",
  powerlifting = "powerlifting",
  cardio = "cardio",
  olympic_weightlifting = "olympic weightlifting",
  crossfit = "crossfit",
  weighted_bodyweight = "weighted bodyweight",
  assisted_bodyweight = "assisted bodyweight",
}

/**
 * Complete exercise definition
 */
export interface Exercise {
  name: string;
  aliases?: string[];
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  force?: Force;
  level: Level;
  mechanic?: Mechanic;
  equipment?: Equipment;
  category: Category;
  instructions: string[];
  description?: string;
  tips?: string[];
}
