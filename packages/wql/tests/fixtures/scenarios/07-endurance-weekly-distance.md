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
- unit: m
- point 2026-06-01: 8000
- point 2026-06-08: 8400
- point 2026-06-15: 8800
- point 2026-06-22: 9200
- point 2026-06-29: 9600
- point 2026-07-06: 10000
