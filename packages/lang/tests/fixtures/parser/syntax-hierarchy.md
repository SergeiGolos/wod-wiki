---
title: "Hierarchical block with blank-line separation"
---

## Script

```wod
(4) Power Sprints
  25m Freestyle Sprint
  1:30 Rest

150m Cooldown
```

## Expected

### Line 1
- Rounds 4 @parser
- Effort "Power Sprints" @parser
- Hint domain.cardio @dialect
- Hint workout.run @dialect
- Hint behavior.aerobic @dialect

### Line 2
- Distance 25 m @parser
- Effort "Freestyle Sprint" @parser
- Hint domain.cardio @dialect
- Hint workout.run @dialect
- Hint behavior.aerobic @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect

### Line 3
- Duration 1:30 @parser
- Effort "Rest" @parser

### Line 5
- Distance 150 m @parser
- Effort "Cooldown" @parser
- Hint domain.cardio @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect
