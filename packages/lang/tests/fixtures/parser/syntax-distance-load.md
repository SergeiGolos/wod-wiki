---
title: "Fused distances, loads, and @-bound resistance"
---

## Script

```wod
400m Run
1000m Row
16kg KB Swing
5 Back Squat @225lb
```

## Expected

### Line 1
- Distance 400 m @parser
- Effort "Run" @parser
- Hint domain.cardio @dialect
- Hint workout.run @dialect
- Hint behavior.aerobic @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect

### Line 2
- Distance 1000 m @parser
- Effort "Row" @parser
- Hint domain.cardio @dialect
- Hint workout.row @dialect
- Hint behavior.aerobic @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect

### Line 3
- Resistance 16 kg @parser
- Effort "KB Swing" @parser

### Line 4
- Rep 5 @parser
- Effort "Back Squat" @parser
- Resistance 225 lb @parser
