# WOD Wiki Workout Library

This directory contains individual workout definitions extracted from the WOD Wiki Storybook examples. Each workout is documented with its syntax, description, and scaling options.

## Categories

### CrossFit Benchmark Workouts
Classic CrossFit workouts used to benchmark fitness progress:

- **[Fran](./fran.md)** - (21-15-9) Thrusters 95lb, Pullups
- **[Annie](./annie.md)** - (50-40-30-20-10) Double-Unders, Situps
- **[Barbara](./barbara.md)** - (5) 20 Pullups, 30 Pushups, 40 Situps, 50 Air Squats, 3:00 Rest
- **[Chelsea](./chelsea.md)** - (30) EMOM: 5 Pullups, 10 Pushups, 15 Air Squats
- **[Cindy](./cindy.md)** - 20:00 AMRAP: 5 Pullups, 10 Pushups, 15 Air Squats
- **[Diane](./diane.md)** - (21-15-9) Deadlift 225lb, Handstand Pushups
- **[Elizabeth](./elizabeth.md)** - (21-15-9) Clean 135lb, Ring Dips
- **[Grace](./grace.md)** - 30 Clean & Jerk 135lb
- **[Helen](./helen.md)** - (3) 400m Run, 21 KB Swings 53lb, 12 Pullups
- **[Isabel](./isabel.md)** - 30 Snatch 135lb
- **[Jackie](./jackie.md)** - 1000m Row, 50 Thrusters 45lb, 30 Pullups
- **[Karen](./karen.md)** - 150 Wall Ball Shots 20lb
- **[Linda](./linda.md)** - (10-9-8-7-6-5-4-3-2-1) Deadlift 1.5BW, Bench Press 1BW, Clean 0.75BW
- **[Mary](./mary.md)** - 20:00 AMRAP: 5 Handstand Pushups, 10 Single-leg Squats, 15 Pullups
- **[Nancy](./nancy.md)** - (5) 400m Run, 15 Overhead Squats 95lb

### StrongFirst Workouts
Kettlebell-focused training programs from StrongFirst methodology:

- **[Simple and Sinister](./simple-and-sinister.md)** - 100 KB Swings, 10 Turkish Getups
- **[KB Axe Heavy](./kb-axe-heavy.md)** - (20) EMOM: 4 KB Swings 106lb
- **[KB Axe Lite](./kb-axe-lite.md)** - (20) EMOM: 6 KB Swings 70lb

### Dan John Workouts
Training programs from strength coach Dan John:

- **[ABC](./abc.md)** - (20) EMOM: 2 Clean, 1 Press, 3 Front Squat
- **[ABC Single Bell](./abc-single-bell.md)** - Kettlebell complex with asymmetrical loading

### Swimming Workouts
Swimming programs for different skill levels and focuses:

- **[Beginner Friendly Swimming](./beginner-friendly-swimming.md)** - Technique development for new swimmers
- **[Intermediate Swimming](./intermediate-swimming.md)** - Well-rounded stroke and skill work
- **[Advanced Swimming](./advanced-swimming.md)** - High-volume training for experienced swimmers
- **[Long Distance Swimming](./long-distance-swimming.md)** - Endurance building for distance events
- **[Sprint Swimming](./sprint-swimming.md)** - Speed and power development
- **[Individual Medley Swimming](./individual-medley-swimming.md)** - All four strokes training

### Additional Workouts
Other workout examples from the Storybook:

- **[Complex AMRAP Workout](./complex-workout.md)** - 20:00 AMRAP with gymnastics skills
- **[EMOM Olympic Lifting Complex](./emom-lifting.md)** - Heavy EMOM lifting complex
- **[Bodyweight Pyramid Workout](./pyramid-workout.md)** - For Time pyramid with bodyweight movements

## WOD Wiki Syntax Guide

The WOD Wiki syntax uses the following patterns:

### Rounds and Repetitions
```
(3)           # 3 rounds
(21-15-9)     # Descending rep scheme
(50-40-30-20-10) # Long descending scheme
```

### Time-Based Workouts
```
20:00 AMRAP   # As Many Rounds As Possible in 20 minutes
(30) :60 EMOM # Every Minute On the Minute for 30 minutes
5:00 100...   # Complete 100 reps in 5 minutes
```

### Exercises
```
Thrusters 95lb          # Exercise with weight
400m Run                # Distance-based cardio
:30 Rest                # Rest period
+ 20 Pullups            # Exercise in EMOM/complex
```

### Complex Structure
```
(20)
  + 1 Clean & Press Left
  + 1 Clean & Press Right 
  + 2 Front Squat Right
  :30 Rest
```

## Usage

Each workout file contains:
- **WOD Wiki Syntax** - The exact syntax for the workout
- **Description** - Workout overview and goals
- **Breakdown** - Detailed structure and targets
- **Tips** - Strategy and technique advice
- **Scaling Options** - Modifications for different fitness levels
- **Technical Notes** - Form and safety considerations

## About

These workouts were extracted from the WOD Wiki project's Storybook examples. They demonstrate various WOD Wiki syntax patterns and provide real-world examples of workout definitions.

For more information about the WOD Wiki project, see the main project documentation.
