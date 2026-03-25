# Syntax: Timers and Intervals

Time components are crucial for workouts. WOD Wiki supports multiple timer modes.

## Duration (For Time)
Just list the exercises. The timer counts **up**.
```wod
100 Burpees
```

## Fixed Time (AMRAP)
Set a time cap using a duration followed by `(AMRAP)`. The timer counts **down**.
```wod
20:00
  (AMRAP)
    5 Pullups
    10 Pushups
    15 Squats
```

## EMOM (Every Minute on the Minute)
Specify the total duration followed by `(EMOM)`.
```wod
10:00
  (EMOM)
    3 Clean & Jerk
```

## Tabata / Intervals
Combine rounds with work/rest timers.
```wod
(8 Rounds)
  :20 Work
  :10 Rest
  Air Squats
```

[← The Basics](wod:syntax/basics) | [Next: Repeaters →](wod:syntax/repeaters)
