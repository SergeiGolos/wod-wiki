---
title: "Weekly volume timeseries for gymnastics"
corpus: crossfit-multi-week
---

## Query

```wql
sum:totalVolume{discipline:gymnastics} by {week}
```

## Expected

### Series totalVolume
- point 2026-06-01: 2790
- point 2026-06-08: 2850
- point 2026-06-15: 2910
- point 2026-06-22: 2970
- point 2026-06-29: 3030
- point 2026-07-06: 3090
