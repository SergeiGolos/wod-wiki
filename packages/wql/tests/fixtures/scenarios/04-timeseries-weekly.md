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
- unit: kg
- point 2026-06-01: 1265.5227123
- point 2026-06-08: 1292.7382545
- point 2026-06-15: 1319.9537967
- point 2026-06-22: 1347.1693389
- point 2026-06-29: 1374.3848811
- point 2026-07-06: 1401.6004233
