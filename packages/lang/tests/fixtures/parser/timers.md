---
title: "Plain timers with efforts"
---

## Script

```wod
5:00 Run
10:00 Row
```

## Expected

### Line 1
- Duration 5:00 @parser
- Effort "Run" @parser
- Hint domain.cardio @dialect
- Hint workout.run @dialect
- Hint behavior.aerobic @dialect

### Line 2
- Duration 10:00 @parser
- Effort "Row" @parser
- Hint domain.cardio @dialect
- Hint workout.row @dialect
- Hint behavior.aerobic @dialect
