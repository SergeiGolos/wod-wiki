---
title: "Endurance weekly running distance"
corpus: endurance-block
---

## Query

```wql
sum:distance{discipline:running} by {week}
```

## Expected

### Series distance
- point 2026-06-01: 8
- point 2026-06-08: 8.4
- point 2026-06-15: 8.8
- point 2026-06-22: 9.2
- point 2026-06-29: 9.6
- point 2026-07-06: 10
