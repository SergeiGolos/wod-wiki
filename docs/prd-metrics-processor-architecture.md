# PRD — Metrics Processor Architecture

**Area**: Analytics / Metrics Pipeline  
**Status**: Ready for engineering  
**Source**: Architecture review + expert domain research (fitness science)

---

## Problem Statement

Athletes and coaches using WOD Wiki cannot get meaningful workout analytics because the system has no principled way to produce them. The metrics pipeline has two problems:

**1. The pipeline is hardcoded and undifferentiated.**  
Every analytics processor runs for every workout regardless of what the workout contains or what dialect it uses. A yoga session runs the volume load calculator. A pure cardio session runs the strength power proxy. The assembly is a list of imperative `addStage()` calls in one component file — adding a new processor means editing that file, and there is no mechanism for the workout type or user preferences to influence which processors activate.

**2. The real-time and summary distinction does not exist in the architecture.**  
Metrics that should be shown live as each segment completes (pace, per-set volume, HIIT quality flags) and metrics that can only be computed after the workout ends (Session Load, Training Intensity Score, total volume) share a single interface with optional methods. The type system cannot express the difference, processors have no declared identity, and tests cannot target either category in isolation.

The result: athletes see no analytics that actually help them understand whether their session went well, and coaches cannot compare intensity across different workout types.

---

## Solution

Restructure the analytics pipeline around three changes:

1. **Split the processor interface** into `IRealtimeProcessor` (per-segment enrichment) and `ISummaryProcessor` (post-workout aggregation), making the real-time / summary distinction a first-class type system concept.

2. **Make processors self-declare** their applicable dialects and required metric types, so the system — not the programmer — decides which processors activate for a given workout.

3. **Introduce an Analytics Profile** that accepts the active dialect and user configuration and returns the correct set of processors. This replaces the hardcoded assembly list and gives dialect and user config direct influence over which calculations run.

On top of the structural work, implement the expert-validated metrics the domain research identified as highest value:
- **Session Load** — the foundational post-session load metric (Session RPE × duration)
- **Training Intensity Score (TIS)** — a cross-discipline composite score that lets coaches compare a weightlifting session to a run
- **Per-set 1RM estimation**, **work-to-rest ratio tracking**, and **HIIT quality flagging** at the real-time layer

---

## User Stories

### General analytics

1. As an athlete, I want to see my pace per segment displayed immediately after each interval completes, so I can gauge whether I am on target without waiting for the session to end.
2. As an athlete, I want to see my power output (strength volume ÷ elapsed time) per set, so I can understand how fatigue is affecting my performance across the session.
3. As an athlete, I want to see my estimated 1RM for each strength set calculated automatically from my reps and weight, so I do not have to do the math myself after every set.
4. As an athlete, I want a total volume load (all sets × reps × weight) shown in my post-session summary, so I can track progressive overload over time.
5. As an athlete, I want to see total distance covered in my post-session summary, so I can log my cardio output without a separate app.

### Session RPE and Session Load

6. As an athlete, I want to be prompted to enter my Session RPE within 30 minutes of finishing my workout, so I can capture how hard the session actually felt before recovery alters my perception.
7. As an athlete, I want my Session Load (Session RPE × total session minutes) calculated automatically once I submit my RPE rating, so I can see a single number that represents the overall training demand.
8. As a coach, I want to see Session Load for each athlete's session, so I can monitor cumulative training stress without requiring heart rate monitors.
9. As an athlete, I want my Session Load to appear in my session summary alongside the other post-workout metrics, so I can compare it across sessions of different types.

### Training Intensity Score (TIS)

10. As a coach, I want a cross-discipline Training Intensity Score (TIS) for each session, so I can meaningfully compare the physiological demand of a weightlifting day against a long run or a HIIT session.
11. As an athlete, I want TIS to reflect my personal physiological capacity (via my VO2max), so the score means something specific to me rather than being based on population averages.
12. As an athlete without a known VO2max, I want TIS to fall back to a population-average baseline, so I still receive a useful score rather than an error.
13. As a coach, I want TIS to apply the correct discipline factor for the workout type (1.2× for strength, 1.0× for cardio and HIIT, 0.9× for yoga), so the score correctly accounts for physiological stresses that heart rate and METs alone cannot capture.
14. As an athlete, I want TIS to be recalculated automatically when I submit my Session RPE, because RPE is 35% of the TIS formula and is the last input to arrive.

### HIIT quality

15. As an athlete doing HIIT, I want each interval segment flagged in real time if my MET output falls below 12.0 METs, so I know when I have failed to reach the intensity needed to trigger a meaningful EPOC response.
16. As an athlete, I want a post-session HIIT quality summary showing what percentage of my HIIT intervals reached the 12.0 MET threshold, so I can evaluate the session as a whole.
17. As a coach, I want the HIIT quality flag to note that MET-based thresholds cannot fully capture anaerobic contribution, so neither I nor the athlete over-interprets the flag.

### Strength autoregulation (RIR)

18. As an athlete doing strength training, I want to record my Reps in Reserve (RIR) per set, so I can track autoregulation in real time.
19. As an athlete, I want per-set RIR to be stored as a distinct metric from Session RPE, because they serve different roles and must never be averaged or combined into a single value.

### Work-to-rest ratio

20. As an athlete doing interval training, I want to see my actual work-to-rest ratio for each round displayed as the round completes, so I can compare it to the prescribed ratio.
21. As an athlete, I want a post-session average work-to-rest ratio in my summary, so I can see whether I took more rest than planned across the whole session.

### Dialect-driven processor selection

22. As an athlete running a cardio-only workout, I want the strength volume processor to be inactive, so my summary is not cluttered with zero-value calculations that do not apply.
23. As an athlete running a strength session, I want the distance pace processor to be inactive, so irrelevant metrics do not appear.
24. As a developer registering a new processor, I want to declare the dialects and metric types the processor applies to in the processor class itself, so I do not have to edit a central assembly file to activate it.
25. As a developer, I want the analytics pipeline to automatically select processors based on the active dialect and the metric types present in the script, so new workouts are handled correctly without manual configuration.

### User profile

26. As an athlete, I want to provide my VO2max in my profile, so that personalized MET-Score normalization is used in TIS calculations.
27. As an athlete who does not know their VO2max, I want to see a note in the TIS output explaining that a population-average METmax was used, so I understand the score's accuracy limitations.

---

## Implementation Decisions

### 1. Split `IAnalyticsStage` into two interfaces

`IAnalyticsStage` (the current unified interface) is replaced by:

- `IRealtimeProcessor` — called for every output statement as it arrives; returns an enriched copy
- `ISummaryProcessor` — called once after the workout ends with the full output history; returns new output statements

A single class may implement both interfaces. The `AnalyticsEngine` holds two typed lists and routes accordingly, eliminating the `if (stage.enrich)` / `if (stage.project)` optional-method guards.

`IAnalyticsStage` is kept as a deprecated union type alias for one release cycle, then removed.

### 2. Processor self-declaration

Both processor interfaces include optional declaration fields:

```
dialects?: string[]          // e.g. ['wod', 'plan'] — empty means all dialects
requiredMetrics?: MetricType[] // AND logic — all must be present for activation
```

These fields are metadata only. The `AnalyticsEngine` itself does not read them — the `AnalyticsProfile` (decision 3) uses them to filter the pool before passing processors to the engine.

### 3. Analytics Profile replaces hardcoded assembly

A new `IAnalyticsProfile` interface accepts an `AnalyticsContext` and returns a configured set of processors. The default implementation — `StandardAnalyticsProfile` — holds a registry of all available processors and filters by dialect and required metrics.

`AnalyticsContext` shape:
```
dialect: string                  // 'wod' | 'log' | 'plan'
scriptMetricTypes: MetricType[]  // metric types found in the parsed script
userProfile?: {
  vo2max?: number                // mL/kg/min — for personalized MET-Score
}
```

The call site (`useWorkbenchRuntime`) constructs a context and asks the profile for processors. It no longer imports or instantiates any processor class directly.

### 4. New MetricTypes

The following values are added to the `MetricType` enum before any new processors ship:

| Value | Role |
|-------|------|
| `MetricType.RIR` | Per-set Reps in Reserve (real-time, strength) |
| `MetricType.SessionRPE` | Post-session subjective effort rating (0–10) |
| `MetricType.SessionLoad` | Session RPE × total minutes |
| `MetricType.METScore` | Normalized MET ((Activity METs ÷ METmax) × 100) |
| `MetricType.TIS` | Training Intensity Score (composite) |

### 5. Post-session input event

Session RPE arrives after the workout ends — after `finalize()` has already run. The runtime requires a new event type: `session-rpe-entered`, carrying the RPE value (0–10).

When this event fires, the `OutputEmitter` triggers a second finalization pass limited to processors that depend on `MetricType.SessionRPE`. This is architecturally new: today all summary processors run exactly once at `finalize()`. This change introduces a conditional second pass for RPE-dependent processors only.

### 6. TIS formula — complete specification

```
TIS = (MET-Score × 0.30) + (RPE-Score × 0.35) + (Duration-Score × 0.20) + (Discipline-Factor × 0.15)

MET-Score       = (Activity METs ÷ METmax) × 100
                  METmax = VO2max ÷ 3.5
                  Fallback when VO2max unknown: METmax = 10.0 (open question — see ADR-0006)

RPE-Score       = Session RPE (0–10) × 10

Duration-Score  = (Duration minutes ÷ 60) × MET-Score
                  [DESIGN ASSUMPTION: Base Intensity Score = MET-Score — see ADR-0002]

Discipline-Factor:
  strength / resistance  → 1.2
  yoga                   → 0.9
  cardio (endurance)     → 1.0
  HIIT                   → 1.0  (anaerobic contribution carried by RPE weight — see ADR-0003)
  mixed / hybrid         → 1.0 default, user override available
```

### 7. Discipline-Factor derives from dialect + metric types

The Discipline-Factor is not selected by dialect alone. A `wod` fence could be a strength session or a cardio session. The selection logic:

1. If `MetricType.Resistance` is present in the script → factor = 1.2
2. Else if the workout is tagged as yoga → factor = 0.9
3. Else → factor = 1.0 (covers cardio, HIIT, and mixed)
4. User profile may override the derived factor

### 8. Session RPE and per-set RIR are independent — never combined

`MetricType.SessionRPE` (a single post-session value, 0–10) and `MetricType.RIR` (a per-set value, integers 0–5) are stored as distinct metric types and serve different roles. Session Load and TIS are computed from `SessionRPE` only. RIR is used for real-time autoregulation display only. No rollup from RIR to SessionRPE is performed (see ADR-0004).

### 9. HIIT quality threshold

A HIIT segment is flagged as underpowered when its MET value is < 12.0. The flag is informational, not blocking. The processor must note in its output that MET-based thresholds undercount anaerobic contribution (anaerobic glycolysis is not captured by METs), and that true HIIT quality also requires adherence to the planned work-to-rest ratios and target Peak Power Output.

### 10. Migration of existing processors

| Existing class | Migrates to | Declaration |
|----------------|------------|-------------|
| `PaceEnrichmentProcess` | `IRealtimeProcessor` | `dialects: []` (all), `requiredMetrics: [Distance \| Rep]` |
| `PowerEnrichmentProcess` | `IRealtimeProcessor` | `dialects: ['wod', 'plan']`, `requiredMetrics: [Rep, Resistance]` |
| `VolumeProjectionEngine` | `ISummaryProcessor` | `dialects: ['wod', 'plan']`, `requiredMetrics: [Rep, Resistance]` |
| `DistanceProjectionEngine` | `ISummaryProcessor` | `dialects: []` (all), `requiredMetrics: [Distance]` |
| `RepProjectionEngine` | `ISummaryProcessor` | `dialects: []` (all), `requiredMetrics: [Rep]` |
| `SessionLoadProjectionEngine` | `ISummaryProcessor` | `dialects: []` (all), `requiredMetrics: [SessionRPE]` |
| `MetMinuteProjectionEngine` | `ISummaryProcessor` | `dialects: []` (all), `requiredMetrics: [MET]` |

### 11. New processors to build

**Real-time:**
- `WorkRestRatioProcessor` — tracks elapsed time per segment type, emits ratio per round
- `OneRMEstimateProcessor` — Epley formula per strength set: `weight × (1 + reps ÷ 30)`
- `RIRProcessor` — accepts user RIR input event, stores as `MetricType.RIR` per segment
- `HIITSegmentFlagProcessor` — emits underpowered flag when MET < 12.0

**Summary:**
- `SessionLoadProcessor` — `Session RPE × total elapsed minutes` → `MetricType.SessionLoad`
- `TISProcessor` — full composite formula → `MetricType.TIS`
- `HIITQualityProcessor` — percentage of intervals ≥ 12.0 METs

---

## Testing Decisions

### What makes a good test in this area

Test the processor's **output given a specific input** — not how it calls internal helpers. A realtime processor test supplies a constructed `IOutputStatement` with known metrics and asserts what comes back. A summary processor test supplies an array of `IOutputStatement` objects and asserts the returned summary outputs. No mock of `AnalyticsEngine` needed at the processor level.

### Modules to test

| Module | Test type | What to verify |
|--------|-----------|---------------|
| `IRealtimeProcessor` implementations | Unit — one statement in, one statement out | Correct derived metrics added; edge cases (zero elapsed, missing inputs) return statement unchanged |
| `ISummaryProcessor` implementations | Unit — array of statements in, summary outputs out | Correct aggregate values; empty input returns empty array |
| `TISProcessor` | Unit | Each formula component in isolation; combined output; fallback when VO2max missing; RPE not yet entered = no TIS output |
| `SessionLoadProcessor` | Unit | Correct multiplication; no output before `session-rpe-entered` event fires |
| `HIITSegmentFlagProcessor` | Unit | Flag present when MET < 12.0; no flag when MET ≥ 12.0; disclaimer text present |
| `StandardAnalyticsProfile` | Unit | Correct processor set returned for each dialect + metric type combination; mixed session returns 1.0 factor |
| `AnalyticsEngine` (routing) | Unit | Realtime processors called per output; summary processors called on finalize; second finalization pass triggered by `session-rpe-entered` |

### Prior art in the codebase

Existing projection engine tests in `tests/` follow the pattern: construct an array of `OutputStatement` objects with specific metrics, call the engine's `project()` method, assert `ProjectionResult` values. New summary processor tests should follow the same shape.

The `BehaviorTestHarness` in `tests/harness/` provides clock control and event simulation that is useful for testing the `session-rpe-entered` event path.

---

## Out of Scope

- **User-facing configuration UI** — the `userProfile` slot in `AnalyticsContext` is a forward-compat placeholder; no settings screen is part of this work
- **Multi-session metrics** — Acute:Chronic Workload Ratio (ACWR) and Training Monotony require a session history store that does not exist; explicitly deferred
- **Heart rate zone tracking** — requires HR device integration; not part of this work
- **New parser tokens or dialect grammar changes** — the dialect mechanism already exists; this work consumes it, does not change it
- **Changes to `OutputEmitter`, `OutputStatement`, or `MetricContainer`** — these modules are stable; only `AnalyticsEngine` wiring changes
- **Fitness transfer coefficients** (running→cycling transfer rates) — mentioned in research but no product use case defined yet

---

## Further Notes

### Expert research basis

This PRD is grounded in a domain expert interview covering Session RPE methodology, Training Intensity Score (TIS) framework, HIIT physiology, and cross-discipline comparison. The TIS formula and all coefficients come from that research. The ADR documents record design decisions made where the research was ambiguous or silent.

### The dialect–discipline factor connection

The most architecturally significant insight from the research session: the TIS `Discipline-Factor` is mathematically equivalent to what the `DialectRegistry` already tracks for parse-time hints. The dialect is not merely a label — for mixed-modality workouts, it is a numerical input to the most important cross-session metric. This validates the architectural direction of passing dialect into `AnalyticsContext`.

### Sequencing recommendation

The three work items should ship in order:
1. Split `IAnalyticsStage` (safe to merge anytime — additive only)
2. Self-declaring processor fields (additive — engine ignores them until step 3)
3. `StandardAnalyticsProfile` + new processors (changes wiring; requires full test suite green)

Session Load and TIS should not ship before the post-session RPE input event is implemented, as their output depends on it.
