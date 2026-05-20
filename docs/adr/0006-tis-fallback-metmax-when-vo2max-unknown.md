# TIS Falls Back to Population-Average METmax When VO2max Is Unknown

The TIS `MET-Score` component is `(Activity METs ÷ METmax) × 100`, where
`METmax = VO2max ÷ 3.5`. When the user has not provided a VO2max value in their
profile, `TISProcessor` must fall back to a default METmax rather than omitting
the metric or emitting an error.

**Status**: proposed

## Open Question — Resolve Before Implementing TISProcessor

The appropriate population-average fallback METmax value has not been determined.
Candidate values depend on the target population:

| Population | Approximate METmax |
|------------|-------------------|
| Sedentary adult (general population) | 8–10 |
| Recreationally active adult | 10–12 |
| Trained athlete | 14–20+ |

**The team must decide**: which population should the fallback represent? Using a
sedentary baseline makes TIS scores appear higher for active users (their METs are
a larger fraction of a low METmax). Using a trained-athlete baseline makes TIS scores
appear lower. A middle value (10–12) is the least wrong for a general fitness audience.

Recommended resolution: use **METmax = 11.4** (equivalent to VO2max = 40 mL/kg/min,
the approximate average for a moderately active adult) and surface a disclosure in the
TIS output noting that a population-average METmax was used and linking to VO2max setup.

## Consequences

TIS outputs produced without a user VO2max must be marked as estimated (`origin:
'analyzed-estimated'` rather than `origin: 'analyzed'`) so downstream displays can
optionally indicate reduced precision. This distinction is not currently in the metric
origin vocabulary and will need to be added.
