---
title: "Total volume grouped by discipline"
corpus: crossfit-multi-week
---

## Query

```wql
sum:totalVolume{} by {discipline}
```

## Errors

- Incompatible units

Ticket 13 arithmetic contract: the corpus's totalVolume observations mix
mass (lb) and count (rep) dimensions even within one discipline, so every
grouped calculation is an incompatible-units diagnostic instead of a
silently pooled sum. Splitting by unit-bearing variant or recording
consistent units restores the query.
