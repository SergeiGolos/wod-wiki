import { Parser } from './Parser';

export default {
  title: 'Parser/Overview',
  component: Parser,
};

// SINGLE STATEMENT EXAMPLES - Various Fragment Combinations

export const SingleStatementRepAction = {
  name: 'Single Statement: Rep + Action',
  args: {
    text: `10 Burpees`
  },
};

export const SingleStatementRepActionResistance = {
  name: 'Single Statement: Rep + Action + Resistance',
  args: {
    text: `5 Deadlifts 225lb`
  },
};

export const SingleStatementTimerAction = {
  name: 'Single Statement: Timer + Action',
  args: {
    text: `30s Plank Hold`
  },
};

export const SingleStatementDistanceAction = {
  name: 'Single Statement: Distance + Action',
  args: {
    text: `400m Run`
  },
};

export const SingleStatementTimerActionResistance = {
  name: 'Single Statement: Timer + Action + Resistance',
  args: {
    text: `45s KB Swings 53lb`
  },
};

export const SingleStatementActionOnly = {
  name: 'Single Statement: Action Only',
  args: {
    text: `[Rest]`
  },
};

// GROUPED WORKOUTS

export const GroupedWorkoutBasic = {
  name: 'Grouped Workout: Basic Round Structure',
  args: {
    text: `(5)
  20 Pullups
  30 Pushups
  40 Situps`
  },
};

export const GroupedWorkoutWithRest = {
  name: 'Grouped Workout: With Rest Between Rounds',
  args: {
    text: `(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  3:00 Rest`
  },
};

// REP SCHEME VARIATIONS (x-x-x) VERSION

export const RepSchemeDescending = {
  name: 'Rep Scheme: Descending (21-15-9)',
  args: {
    text: `(21-15-9) 
  Thrusters 95lb
  Pullups`
  },
};

export const RepSchemeAscending = {
  name: 'Rep Scheme: Ascending (1-2-3-4-5)',
  args: {
    text: `(1-2-3-4-5)
  Muscle-ups
  Handstand Pushups`
  },
};

export const RepSchemeComplex = {
  name: 'Rep Scheme: Complex (10-9-8-7-6-5-4-3-2-1)',
  args: {
    text: `(10-9-8-7-6-5-4-3-2-1)
  Deadlift 1.5BW
  Bench Press 1BW
  Clean 0.75BW`
  },
};

export const RepSchemeIrregular = {
  name: 'Rep Scheme: Irregular (50-40-30-20-10)',
  args: {
    text: `(50-40-30-20-10)
  Double-Unders
  Situps`
  },
};

// EMOM (EVERY MINUTE ON THE MINUTE) PATTERNS

export const EmomBasic = {
  name: 'EMOM: Basic Pattern',
  args: {
    text: `(12) :60 EMOM
  5 Pullups
  10 Pushups`
  },
};

export const EmomWithPlus = {
  name: 'EMOM: With Plus Indicators',
  args: {
    text: `(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  },
};

export const EmomDifferentInterval = {
  name: 'EMOM: Different Time Interval',
  args: {
    text: `(10) 2:00 EMOM
  10 Thrusters 95lb
  15 Pullups`
  },
};

// REP TYPE VARIATIONS (+, -, NONE, MIXED)

export const RepTypePlus = {
  name: 'Rep Type: Plus Indicators',
  args: {
    text: `(3)
  + 10 Pushups
  + 15 Situps
  + 20 Air Squats`
  },
};

export const RepTypeMinus = {
  name: 'Rep Type: Minus Indicators',
  args: {
    text: `(4)
  - 5 Pullups
  - 10 Pushups
  - 15 Burpees`
  },
};

export const RepTypeMixed = {
  name: 'Rep Type: Mixed Indicators',
  args: {
    text: `(5)
  + 20 Kettlebell Swings
  10 Burpees
  - 5 Pullups`
  },
};

export const RepTypeNone = {
  name: 'Rep Type: No Indicators',
  args: {
    text: `(3)
  15 Pushups
  20 Situps
  25 Air Squats`
  },
};

// COUNTDOWN AND COUNT-UP TIMER PATTERNS

export const TimerCountdown = {
  name: 'Timer: Countdown Pattern',
  args: {
    text: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
};

export const TimerTabata = {
  name: 'Timer: Tabata Pattern',
  args: {
    text: `(8) 20s/10s
  Burpees`
  },
};

export const TimerForTime = {
  name: 'Timer: For Time Pattern',
  args: {
    text: `For Time:
  1000m Row
  50 Thrusters 45lb
  30 Pullups`
  },
};

export const TimerIntervals = {
  name: 'Timer: Interval Training',
  args: {
    text: `(5)
  4:00 On
  2:00 Off
  + 500m Row
  + 20 Burpees`
  },
};

// COMPLEX FRAGMENT COMBINATIONS

export const ComplexMultipleFragments = {
  name: 'Complex: Multiple Fragment Types',
  args: {
    text: `(3) 
  400m Run
  21 KB Swings 53lb
  12 Pullups
  2:00 Rest`
  },
};

export const ComplexEffortDistance = {
  name: 'Complex: Effort + Distance',
  args: {
    text: `5000m Row @ 80% effort`
  },
};

export const ComplexLapsAndDistance = {
  name: 'Complex: Laps + Distance',
  args: {
    text: `(10) 100m Sprints
  90s Rest between laps`
  },
};

export const ComplexIncrementalRounds = {
  name: 'Complex: Incremental Rounds',
  args: {
    text: `(5)
  Round 1: 10 Burpees
  Round 2: 15 Burpees  
  Round 3: 20 Burpees
  Round 4: 25 Burpees
  Round 5: 30 Burpees`
  },
};

// ADVANCED WORKOUT PATTERNS

export const AdvancedChipper = {
  name: 'Advanced: Chipper Style',
  args: {
    text: `For Time:
  100 Pullups
  100 Pushups
  100 Situps
  100 Air Squats`
  },
};

export const AdvancedPyramid = {
  name: 'Advanced: Pyramid Structure',
  args: {
    text: `(1-2-3-4-5-4-3-2-1)
  Muscle-ups
  Handstand Pushups`
  },
};

export const AdvancedSuperset = {
  name: 'Advanced: Superset Pattern',
  args: {
    text: `(4)
  A1: 8 Back Squats 225lb
  A2: 12 Pullups
  2:00 Rest
  B1: 10 Bench Press 185lb
  B2: 15 Pushups`
  },
};

export const AdvancedMixedModal = {
  name: 'Advanced: Mixed Modal Training',
  args: {
    text: `20:00 AMRAP
  400m Run
  30 Wall Ball Shots 20lb
  30 KB Swings 53lb
  30 Box Jumps 24"`
  },
};
