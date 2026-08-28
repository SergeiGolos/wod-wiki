---
title: "Percent intensity fused from a trailing % token"
---

## Script

```wod
Run 400m 80%
Back Squat 225lb 85%
```

## Expected

### Line 1
- Effort "Run" @parser
- Distance 400 m @parser
- Intensity 80 % @parser
- Hint domain.cardio @dialect
- Hint workout.run @dialect
- Hint behavior.aerobic @dialect
- Hint behavior.distance_based @dialect
- Hint behavior.pace_based @dialect

### Line 2
- Effort "Back Squat" @parser
- Resistance 225 lb @parser
- Intensity 85 % @parser
