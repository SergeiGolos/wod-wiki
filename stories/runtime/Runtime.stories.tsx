import { RuntimeFixture } from "./RuntimeFixture";

export default {
  title: 'Runtime/Overview',
  component: RuntimeFixture,
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
  name: 'Rep Scheme: Ascending (9-15-21)',
  args: {
    text: `(9-15-21)
  Box Jumps 24"
  Push Presses 75lb`
  },
};

export const RepSchemePyramid = {
  name: 'Rep Scheme: Pyramid (1-2-3-4-5)',
  args: {
    text: `(1-2-3-4-5)
  Muscle-ups
  Handstand Pushups`
  },
};

export const RepSchemeComplex = {
  name: 'Rep Scheme: Complex (50-40-30-20-10)',
  args: {
    text: `(50-40-30-20-10)
  Double-Unders
  Situps`
  },
};

// EMOM MULTIPLE ITEMS

export const EMOMSingle = {
  name: 'EMOM: Single Exercise',
  args: {
    text: `(12) :60 EMOM
  5 Burpees`
  },
};

export const EMOMMultiple = {
  name: 'EMOM: Multiple Exercises',
  args: {
    text: `(15) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  },
};

export const EMOMComplex = {
  name: 'EMOM: Complex with Varying Reps',
  args: {
    text: `(20) :60 EMOM
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb`
  },
};

// VARIETY OF REP TYPES: + / - (none)

export const RepTypeAddition = {
  name: 'Rep Type: Addition (+)',
  args: {
    text: `(3)
  + 5 Pullups
  + 10 Pushups
  + 15 Squats`
  },
};

export const RepTypeSubtraction = {
  name: 'Rep Type: Subtraction (-)',
  args: {
    text: `(3)
  - 20 Burpees
  - 15 Box Jumps
  - 10 Muscle-ups`
  },
};

export const RepTypeNone = {
  name: 'Rep Type: None (Standard)',
  args: {
    text: `(5)
  10 Thrusters 95lb
  15 Pullups
  20 Box Jumps`
  },
};

export const RepTypeMixed = {
  name: 'Rep Type: Mixed (+/-/none)',
  args: {
    text: `(4)
  + 5 Strict Pullups
  10 Regular Pushups
  - 15 Jumping Squats`
  },
};

// COUNT DOWN TIMER

export const CountdownTimer = {
  name: 'Countdown Timer: AMRAP',
  args: {
    text: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
};

export const CountdownTimerTabata = {
  name: 'Countdown Timer: Tabata Style',
  args: {
    text: `(8) 20s/10s
  Burpees`
  },
};

// COUNT UP AND COUNT DOWN

export const CountUpTimer = {
  name: 'Count Up: For Time',
  args: {
    text: `For Time:
  100 Burpees
  75 Situps
  50 Pushups
  25 Handstand Pushups`
  },
};

export const CountDownCountUp = {
  name: 'Count Down + Count Up: Mixed Timing',
  args: {
    text: `15:00 Time Cap
  For Time:
  (21-15-9)
  Deadlifts 225lb
  Handstand Pushups`
  },
};

export const IntervalTraining = {
  name: 'Interval: Count Down with Rest',
  args: {
    text: `(5)
  4:00 Work
  + 20 Thrusters 95lb
  + 30 Pullups
  2:00 Rest`
  },
};
