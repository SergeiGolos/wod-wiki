---
title: "Reps with a starred rest timer"
---

## Script

```wod
10 Burpees
*:30 Rest
10 Burpees
```

## Expected

### Line 1
- Rep 10 @parser
- Effort "Burpees" @parser

### Line 2
- Duration 0:30 @parser
- Hint behavior.required_timer @parser
- Effort "Rest" @parser

### Line 3
- Rep 10 @parser
- Effort "Burpees" @parser
