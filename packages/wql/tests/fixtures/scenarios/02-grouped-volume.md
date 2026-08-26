---
title: "Total volume grouped by discipline"
corpus: crossfit-multi-week
---

## Query

```wql
sum:totalVolume{} by {discipline}
```

## Expected

### Series gymnastics
- value: 17640
- unit: lb

### Series kettlebell
- value: 33750
- unit: lb

### Series bodyweight
- value: 2385
- unit: rep
