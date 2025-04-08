# Lap Feature

The Lap Feature allows you to group multiple exercises into a single logical unit within a workout script. This is especially useful for workout patterns like EMOM (Every Minute On the Minute), where multiple movements need to be completed within a single timed interval.

## Basic Syntax

To indicate that exercises should be treated as part of the same lap, prefix each exercise with a `+` symbol:

```
(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```

In this example, all three exercises are considered part of a single 60-second unit, and this unit is repeated 30 times.

## How It Works

Behind the scenes, the Lap Feature works by:

1. The parser identifies statements with `+` symbols as containing "LapFragment" elements
2. These statements are marked with `isLeaf: true`, even if they have child nodes
3. The runtime treats these nodes as leaf nodes, ensuring that all their children are processed together as a single unit
4. This prevents the runtime from navigating into individual child nodes separately

## Use Cases

### EMOM (Every Minute On the Minute)

```
(20) :60 EMOM
  + 10 Kettlebell Swings 53lb
  + 10 Box Jumps 24"
```

Each minute, perform both exercises (10 KB swings followed by 10 box jumps), resting any remaining time within the minute. Repeat for 20 rounds.

### Short Circuit Within AMRAP

```
(20:00)
  15 Wall Balls 20lb
  (3)
    + 5 Pullups
    + 10 Pushups
  20 Double-Unders
```

Within a 20-minute AMRAP, perform 15 wall balls, then a mini-circuit of 5 pullups and 10 pushups (repeated 3 times), followed by 20 double-unders.

### Interval Training with Complex Movements

```
(8) :240 :60
  + 400m Run
  + 15 Burpees
```

Eight rounds of a complex interval: perform a 400m run followed by 15 burpees with a 4-minute work period and 1-minute rest period.

## Comparison with Traditional Structure

| Lap Feature (with `+`) | Traditional Structure (without `+`) |
|------------------------|-------------------------------------|
| Multiple exercises form a single unit | Each exercise is processed individually |
| Timer applies to the entire group | Timer applies to each individual exercise |
| All exercises must be completed within the interval | Each exercise has its own timing consideration |

## Technical Implementation

The Lap Feature is implemented through:

1. The `isLeaf` property on the `StatementNode` interface
2. Detection of lap fragments in the parser's visitor pattern
3. Special handling in the runtime execution engine

This creates a flexible workout structure that can represent complex training patterns while maintaining a clean, simple syntax.
