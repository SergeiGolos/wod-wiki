# TIS Duration-Score: Base Intensity Score Interpreted as MET-Score

The Training Intensity Score (TIS) formula includes a `Duration-Score` component:
`(Duration ÷ 60) × Base Intensity Score`. The expert research framework defines this
term once but never provides its formula. Based on the framework's stated logic — "60
minutes of high-intensity work should score higher than 60 minutes of low intensity" —
we interpret `Base Intensity Score` as the session's normalized `MET-Score`
(`(Activity METs ÷ METmax) × 100`). This is the only already-computed normalized
intensity value in the formula, and it is calculated before `Duration-Score` in the
evaluation order.

**Status**: proposed

## Open Question

When work on `TISProcessor` begins, the team should attempt to obtain the original
source material that defines `Base Intensity Score` precisely. If a different definition
is found, this ADR should be updated and `TISProcessor` recalculated accordingly.

## Considered Options

**Base Intensity Score = MET-Score (chosen)** — already normalized to 0–100, represents
physiological intensity, computed earlier in the same formula. Produces correct
directional behaviour.

**Base Intensity Score = (MET-Score + RPE-Score) ÷ 2** — blends objective and subjective
signals, but adds complexity with no source support and introduces circularity (RPE-Score
is already a direct term in TIS).

**Base Intensity Score = raw METs** — not normalized; would make Duration-Score sensitive
to absolute MET values rather than relative intensity, breaking comparisons across
athletes with different fitness levels.
