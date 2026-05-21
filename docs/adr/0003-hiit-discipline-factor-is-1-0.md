# HIIT Discipline-Factor Is 1.0 — Anaerobic Contribution Carried by RPE Weight

The TIS `Discipline-Factor` has explicit coefficients for strength (1.2×) and yoga
(0.9×) in the expert research framework. No separate coefficient is defined for HIIT.
The framework explicitly states that TIS "partially addresses" HIIT's high anaerobic
contribution "through RPE weighting" — the `RPE-Score` component carries 35% of the
total TIS weight and naturally captures the near-maximal exertion of HIIT intervals
through the athlete's subjective rating. We therefore assign HIIT a `Discipline-Factor`
of 1.0 (the cardio baseline), consistent with the framework's guidance.

**Status**: proposed

## Open Question

If future research or domain expert input provides a specific HIIT multiplier, this ADR
should be updated. A value between 1.0 and 1.2 (below strength, above cardio) would be
physiologically defensible given HIIT's elevated EPOC relative to steady-state cardio.

## Consequences

HIIT sessions will score their intensity primarily through the RPE-Score component. A
session where the athlete does not submit Session RPE will have an incomplete TIS — this
is a feature, not a bug: it correctly reflects that the most important HIIT intensity
signal is missing.
