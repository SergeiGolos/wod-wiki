/**
 * Test data structures for comprehensive runtime execution validation
 */

export interface WorkoutTestCase {
  name: string;
  script: string;
  expectedNextCalls: number;
  expectedRounds: number[];
  expectedReps: number[];
  validationSteps: ValidationStep[];
  workoutType: 'variable-rep' | 'fixed-rounds' | 'time-based' | 'complex';
}

export interface ValidationStep {
  stepNumber: number;
  expectedStackDepth: number;
  expectedCurrentRound?: number;
  expectedReps?: number;
  expectedBlockType?: string;
  memoryAssertions?: MemoryAssertion[];
}

export interface MemoryAssertion {
  type: string;
  expectedValue?: any;
  shouldExist?: boolean;
}

// Variable Rep Scheme Workouts
export const VARIABLE_REP_WORKOUTS: WorkoutTestCase[] = [
  {
    name: 'Fran',
    script: `(21-15-9)
Thrusters 95lb
Pullups`,
    expectedNextCalls: 7,
    expectedRounds: [1, 1, 2, 2, 3, 3],
    expectedReps: [21, 21, 15, 15, 9, 9],
    workoutType: 'variable-rep',
    validationSteps: [
      {
        stepNumber: 1,
        expectedStackDepth: 2,
        expectedCurrentRound: 1,
        expectedReps: 21,
        expectedBlockType: 'Effort',
        memoryAssertions: [
          { type: 'rounds-current', expectedValue: 1 },
          { type: 'rounds-total', expectedValue: 3 }
        ]
      },
      {
        stepNumber: 2,
        expectedStackDepth: 2,
        expectedCurrentRound: 1,
        expectedReps: 21,
        expectedBlockType: 'Effort'
      },
      {
        stepNumber: 3,
        expectedStackDepth: 2,
        expectedCurrentRound: 2,
        expectedReps: 15,
        expectedBlockType: 'Effort'
      },
      {
        stepNumber: 4,
        expectedStackDepth: 2,
        expectedCurrentRound: 2,
        expectedReps: 15,
        expectedBlockType: 'Effort'
      },
      {
        stepNumber: 5,
        expectedStackDepth: 2,
        expectedCurrentRound: 3,
        expectedReps: 9,
        expectedBlockType: 'Effort'
      },
      {
        stepNumber: 6,
        expectedStackDepth: 2,
        expectedCurrentRound: 3,
        expectedReps: 9,
        expectedBlockType: 'Effort'
      },
      {
        stepNumber: 7,
        expectedStackDepth: 0,
        memoryAssertions: [
          { type: 'completion-status', expectedValue: true }
        ]
      }
    ]
  },
  {
    name: 'Annie',
    script: `(50-40-30-20-10)
Double-Unders
Situps`,
    expectedNextCalls: 10,
    expectedRounds: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    expectedReps: [50, 50, 40, 40, 30, 30, 20, 20, 10, 10],
    workoutType: 'variable-rep',
    validationSteps: []
  },
  {
    name: 'Linda',
    script: `(10-9-8-7-6-5-4-3-2-1)

Deadlift 1.5BW
Bench Press 1BW
Clean 0.75BW`,
    expectedNextCalls: 30,
    expectedRounds: Array.from({ length: 30 }, (_, i) => Math.floor(i / 3) + 1),
    expectedReps: Array.from({ length: 30 }, (_, i) => 10 - Math.floor(i / 3)),
    workoutType: 'variable-rep',
    validationSteps: []
  }
];

// Fixed Rounds Workouts
export const FIXED_ROUNDS_WORKOUTS: WorkoutTestCase[] = [
  {
    name: 'Barbara',
    script: `(5)
+ 20 Pullups
+ 30 Pushups
+ 40 Situps
+ 50 Air Squats
3:00 Rest`,
    expectedNextCalls: 20,
    expectedRounds: Array.from({ length: 20 }, (_, i) => Math.floor(i / 4) + 1),
    expectedReps: [],
    workoutType: 'fixed-rounds',
    validationSteps: []
  },
  {
    name: 'Helen',
    script: `(3)
400m Run
21 KB Swings 53lb
12 Pullups`,
    expectedNextCalls: 9,
    expectedRounds: Array.from({ length: 9 }, (_, i) => Math.floor(i / 3) + 1),
    expectedReps: [],
    workoutType: 'fixed-rounds',
    validationSteps: []
  }
];

// Time-Based Workouts
export const TIME_BASED_WORKOUTS: WorkoutTestCase[] = [
  {
    name: 'Cindy',
    script: `20:00 AMRAP
5 Pullups
10 Pushups
15 Air Squats`,
    expectedNextCalls: 0, // Unlimited until timer expires
    expectedRounds: [],
    expectedReps: [],
    workoutType: 'time-based',
    validationSteps: []
  },
  {
    name: 'Chelsea',
    script: `(30) :60 EMOM
+ 5 Pullups
+ 10 Pushups
+ 15 Air Squats`,
    expectedNextCalls: 30,
    expectedRounds: Array.from({ length: 30 }, (_, i) => i + 1),
    expectedReps: [],
    workoutType: 'time-based',
    validationSteps: []
  }
];

// Complex Workouts
export const COMPLEX_WORKOUTS: WorkoutTestCase[] = [
  {
    name: 'Diane',
    script: `(21-15-9)
Deadlift 225lb
Handstand Pushups`,
    expectedNextCalls: 6,
    expectedRounds: [1, 1, 2, 2, 3, 3],
    expectedReps: [21, 21, 15, 15, 9, 9],
    workoutType: 'complex',
    validationSteps: []
  },
  {
    name: 'Elizabeth',
    script: `(21-15-9)
Clean 135lb
Ring Dips`,
    expectedNextCalls: 6,
    expectedRounds: [1, 1, 2, 2, 3, 3],
    expectedReps: [21, 21, 15, 15, 9, 9],
    workoutType: 'complex',
    validationSteps: []
  }
];

// All workout test cases
export const ALL_WORKOUT_TEST_CASES: WorkoutTestCase[] = [
  ...VARIABLE_REP_WORKOUTS,
  ...FIXED_ROUNDS_WORKOUTS,
  ...TIME_BASED_WORKOUTS,
  ...COMPLEX_WORKOUTS
];

// Helper functions
export function getWorkoutByName(name: string): WorkoutTestCase | undefined {
  return ALL_WORKOUT_TEST_CASES.find(workout => workout.name === name);
}

export function getWorkoutsByType(type: WorkoutTestCase['workoutType']): WorkoutTestCase[] {
  return ALL_WORKOUT_TEST_CASES.filter(workout => workout.workoutType === type);
}