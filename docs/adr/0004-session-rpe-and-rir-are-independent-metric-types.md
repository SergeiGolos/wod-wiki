# Session RPE and Per-Set RIR Are Independent Metric Types — Never Combined

The system captures effort at two levels: per-set Reps in Reserve (`MetricType.RIR`,
a real-time strength autoregulation tool, integer 0–5) and Session RPE
(`MetricType.SessionRPE`, a single post-session holistic effort rating, scale 0–10).
These are stored as distinct metric types and serve different purposes. No rollup,
average, or derivation from RIR to SessionRPE is performed.

**Status**: proposed

## Why This Matters

The expert research framework is unambiguous on this point. Session RPE is defined as
a "holistic integration of multiple physiological, psychological, and environmental
signals" captured as a single number reflecting the *entire session*. It is explicitly
not an average of per-set exertion scores. Rolling up RIR values would undermine the
validity of Session Load and TIS, both of which rely on Session RPE's whole-session
character. Recording it separately after the session — before post-workout recovery
interventions alter perception — is part of the methodology.

## Considered Options

**Roll up per-set RIR into Session RPE** — rejected. Physiologically inaccurate.
Warm-up and cool-down are included in Session RPE but have no per-set RIR entry.
The subjective integration that makes Session RPE valuable cannot be replicated
by arithmetic over segment-level values.

**Treat them as the same metric type** — rejected. They have different input surfaces
(per-set entry vs. post-session entry), different temporal scopes, and feed different
downstream calculations.

**Independent types (chosen)** — `RIR` feeds the real-time autoregulation display;
`SessionRPE` feeds `SessionLoad` and `TIS`. Each is entered separately by the athlete.
