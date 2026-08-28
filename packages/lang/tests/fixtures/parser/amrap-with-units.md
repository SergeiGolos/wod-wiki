---
title: "AMRAP structure with fused units"
---

## Script

```wod
AMRAP 20
5 Pull-ups
225 lb Back Squat
5 km Row
```

## Expected

### Line 1
- Effort "AMRAP" @parser
- Rep 20 @parser
- Hint behavior.time_bound @dialect
- Hint workout.amrap @dialect

### Line 2
- Rep 5 @parser
- Effort "Pull-ups" @parser

### Line 3
- Resistance 225 lb @parser
- Effort "Back Squat" @parser

### Line 4
- Distance 5 km @parser
- Effort "Row" @parser
- Hint domain.cardio @dialect
- Hint workout.row @dialect
- Hint behavior.aerobic @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect
