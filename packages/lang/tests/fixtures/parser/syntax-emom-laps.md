---
title: "EMOM protocol with plus-composed laps"
---

## Script

```wod
(10) :60 EMOM
  + 2 Burpees
  + 5 Push Ups
  + 7 Air Squats
```

## Expected

### Line 1
- Rounds 10 @parser
- Duration 1:00 @parser
- Effort "EMOM" @parser
- Hint behavior.repeating_interval @dialect
- Hint workout.emom @dialect

### Line 2
- Group "compose" @parser
- Rep 2 @parser
- Effort "Burpees" @parser

### Line 3
- Group "compose" @parser
- Rep 5 @parser
- Effort "Push Ups" @parser

### Line 4
- Group "compose" @parser
- Rep 7 @parser
- Effort "Air Squats" @parser
