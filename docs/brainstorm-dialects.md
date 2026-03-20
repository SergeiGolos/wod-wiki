# Feature: Dialects — Decoupling Language from Domain

**Brainstorm Date:** March 20, 2026
**Status:** Draft
**Issue:** Decouple language and dialects, define core dialects, establish interfaces for dialect application

---

## 1. Requirement Analysis

- **Core Problem**: The dialect system currently conflates two distinct concerns: (1) *execution mode dialects* (`wod`/`log`/`plan` as defined in `docs/finishline/dialect-system.md`) that control how blocks *execute*, and (2) *domain measurement dialects* (CrossFit, swimming, running, etc.) that control how workout statements are *interpreted* and what *metrics* they produce. The `IDialect` interface in `src/core/models/Dialect.ts` currently serves only the domain-analysis role (hint generation), while the execution-mode dialect is handled implicitly by strategy selection. These two axes need explicit separation: a **measurement dialect** defines domain-specific vocabulary, metric overrides, and inheritance rules; a **language dialect** (execution mode) controls runtime behavior injection. The current `CrossFitDialect` is the only domain dialect — the system needs a pluggable registry of domain dialects (weights, CrossFit, swimming, running, kettlebell, etc.) each contributing metric mutation strategies.

- **Success Criteria**:
  - Clear separation between *measurement dialects* (domain-specific metric interpretation) and *language dialects* (execution mode — wod/log/plan).
  - A core set of measurement dialects is defined: weights, CrossFit, swimming, running, kettlebell.
  - Each measurement dialect can: add domain-specific metrics, override parser metrics with domain units, provide metric inheritance rules for child blocks, and emit domain-specific hints.
  - Measurement dialects compose — a workout can activate multiple measurement dialects simultaneously (e.g., CrossFit + Weights).
  - The `IDialect` interface hierarchy is formalized with core interfaces for registration, composition, and application.
  - Existing `CrossFitDialect` is refactored to conform to the new hierarchy.
  - Strategy matching can query both dialect axes when deciding block compilation.

- **Scope**: Architectural brainstorm — no code changes. Produce analysis document and visual canvas.

- **User Impact**: Users writing workout scripts benefit from domain-aware metric interpretation. A "500m Row" in a CrossFit dialect automatically infers distance units and pacing metrics. A "10x32kg Swings" in a Kettlebell dialect infers resistance units and movement classification. Dialect composition lets users mix domains naturally (CrossFit workouts that include running segments).

### Summary

The current `IDialect` interface provides a hint-generation contract (`analyze() → DialectAnalysis`) consumed by the JIT compiler's strategy matching phase. This works for recognizing workout patterns (AMRAP, EMOM) but does not address the broader dialect concept: domain-specific measurement systems, unit conventions, metric enrichment, and composability across fitness domains. This brainstorm proposes a two-axis dialect architecture where **measurement dialects** (domain) and **language dialects** (execution mode) are independently composable, each with well-defined interfaces for metric mutation, hint emission, and strategy influence.

---

## 2. Code Exploration

### Relevant Files

| File | Role |
|------|------|
| `src/core/models/Dialect.ts` | Defines `IDialect`, `DialectAnalysis`, `InheritanceRule`, `InheritanceMode` |
| `src/services/DialectRegistry.ts` | Registry for dialect registration and `processAll()` hint injection |
| `src/dialects/CrossFitDialect.ts` | Only domain dialect — recognizes AMRAP, EMOM, FOR TIME, TABATA patterns |
| `src/dialects/CrossFitDialect.test.ts` | Tests for CrossFit pattern recognition |
| `src/dialects/index.ts` | Barrel export for dialect module |
| `src/runtime/compiler/JitCompiler.ts` | Orchestrates dialect processing → strategy matching → block building |
| `src/runtime/compiler/BlockBuilder.ts` | Aspect composer pattern for block construction |
| `src/runtime/compiler/strategies/` | Strategy implementations organized by priority tier |
| `src/core/models/Metric.ts` | `MetricType` enum (19 types including Distance, Resistance), `MetricOrigin`, `IMetric` |
| `src/core/utils/metricPrecedence.ts` | `ORIGIN_PRECEDENCE` map and resolution algorithm |
| `src/runtime/compiler/metrics/` | 14 metric type implementations (DurationMetric, DistanceMetric, etc.) |
| `src/testing/harness/WorkoutTestHarness.ts` | References `DialectRegistry` and `IDialect` for testing |
| `src/testing/harness/MockJitCompiler.ts` | Mock compiler accepting `DialectRegistry` |
| `docs/finishline/dialect-system.md` | Execution-mode dialects (wod/log/plan) — orthogonal to this brainstorm |

### Similar Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| **CrossFitDialect** | `src/dialects/CrossFitDialect.ts` | The only domain dialect. Demonstrates keyword-based pattern matching on Action/Effort metrics. Emits `behavior.*` and `workout.*` hints. |
| **DialectRegistry** | `src/services/DialectRegistry.ts` | Already supports multi-dialect registration and sequential processing. Foundation for composable dialects. |
| **Strategy pattern** | `src/runtime/compiler/strategies/` | Priority-based strategy matching consumes hints from dialects. New measurement dialects feed into this pipeline. |
| **MetricType.Distance / Resistance** | `src/core/models/Metric.ts` | Built-in metric types for physical measurements. Domain dialects would standardize how these are parsed and displayed. |
| **Metric promotion** | `src/runtime/behaviors/MetricPromotionBehavior.ts` | Parent→child metric cascading. Domain dialects could define promotion rules per domain (e.g., Kettlebell weight promoted to all child movements). |
| **InheritanceRule** | `src/core/models/Dialect.ts` | Already defined but not yet implemented. Designed for parent→child value inheritance — exactly what domain dialects need. |
| **Execution-mode dialects** | `docs/finishline/dialect-system.md` | Defines wod/log/plan modes that control execution semantics. These are *orthogonal* to measurement dialects. |

### Key Patterns

| Pattern | How It Applies |
|---------|---------------|
| **Hint-based strategy matching** | Dialects emit hints → strategies query hints. Domain dialects would emit measurement-specific hints (e.g., `domain.kettlebell`, `unit.kg`, `movement.swing`) that strategies or UI renderers query. |
| **Registry + processAll()** | `DialectRegistry` iterates all registered dialects per statement. Multiple measurement dialects process the same statement, each contributing their domain analysis. |
| **InheritanceRule (unused)** | `DialectAnalysis` already returns optional `InheritanceRule[]` but these are not consumed. This is the intended injection point for domain-specific metric inheritance (e.g., "parent weight applies to all children unless overridden"). |
| **MetricOrigin layering** | The `ORIGIN_PRECEDENCE` system (4 tiers) already handles multi-source metrics. Domain dialect metrics would slot into the existing precedence, likely at the `hinted` or a new `dialect` origin. |
| **Aspect composer pattern** | `BlockBuilder` uses `.asTimer()`, `.asRepeater()`, `.asContainer()` for composable block construction. Domain dialects could contribute their own aspect composers (e.g., `.withResistanceTracking()`, `.withDistanceTracking()`). |

---

## 3. Proposed Solutions

### Solution A: Two-Axis Dialect Registry with IMeasurementDialect Interface

**How It Works:** Introduce a clear type hierarchy separating measurement dialects from language/execution dialects. Define `IMeasurementDialect` extending `IDialect` with domain-specific capabilities: metric enrichment, unit normalization, and movement classification. The `DialectRegistry` gains awareness of both axes and processes them independently — measurement dialects run during compilation (enriching metrics and hints), while language dialects influence runtime behavior injection.

**New Interfaces:**

```typescript
// Core measurement dialect interface
interface IMeasurementDialect extends IDialect {
  /** Domain identifier (e.g., 'crossfit', 'running', 'kettlebell') */
  domain: string;
  
  /** 
   * Supported metric types this dialect can enrich.
   * Used for fast filtering — only dialects that handle Distance
   * are consulted for distance-bearing statements.
   */
  supportedMetrics: MetricType[];
  
  /**
   * Enrich a statement with domain-specific metric mutations.
   * Called after analyze() — can add, modify, or annotate metrics.
   * Returns metric overrides that are injected at 'dialect' origin.
   */
  enrich(statement: ICodeStatement): MetricEnrichment;
  
  /**
   * Get inheritance rules for how parent metrics cascade to children.
   * Domain-specific: Kettlebell dialect promotes resistance to all children;
   * Running dialect promotes distance/pace to intervals.
   */
  getInheritanceRules(statement: ICodeStatement): InheritanceRule[];
}

interface MetricEnrichment {
  /** New metrics to add (origin: 'dialect') */
  additions?: IMetric[];
  /** Metric types to suppress from lower layers */
  nullifications?: MetricType[];
  /** Unit normalizations (e.g., 'lbs' → 'lb', 'meters' → 'm') */
  unitNormalizations?: Map<MetricType, string>;
}
```

**Core Measurement Dialects:**

| Dialect | Domain | Key Metrics | Example Statements |
|---------|--------|------------|-------------------|
| **WeightsDialect** | `weights` | Resistance, Rep, Load | `"5x225lb Back Squat"` → resistance=225lb, rep=5, effort=Back Squat |
| **CrossFitDialect** | `crossfit` | (existing) + Volume, Intensity | `"AMRAP 20 mins"` → workout.amrap, behavior.time_bound |
| **SwimmingDialect** | `swimming` | Distance, Duration, Lap | `"500m Freestyle"` → distance=500m, effort=Freestyle, domain.swimming |
| **RunningDialect** | `running` | Distance, Duration, Metric (pace) | `"1 mile Run"` → distance=1mi, effort=Run, domain.running |
| **KettlebellDialect** | `kettlebell` | Resistance, Rep, Effort | `"10x32kg KB Swings"` → resistance=32kg, rep=10, effort=KB Swings |

**Registry Changes:**

```typescript
class DialectRegistry {
  private measurementDialects: Map<string, IMeasurementDialect>;
  private languageDialect: ILanguageDialect;  // wod/log/plan
  
  registerMeasurement(dialect: IMeasurementDialect): void;
  setLanguageDialect(dialect: ILanguageDialect): void;
  
  // Two-phase processing
  processAnalysis(statements: ICodeStatement[]): void;    // hints
  processEnrichment(statements: ICodeStatement[]): void;  // metrics
}
```

- **Implementation Complexity**: Medium-High
- **Alignment with Existing Patterns**: Good — extends existing `IDialect` interface, uses existing `DialectRegistry` as foundation, leverages existing `InheritanceRule` type.
- **Testing Strategy**: Unit test each dialect's `analyze()` and `enrich()` independently; integration test via `JitCompiler` with multiple active dialects.
- **Risks**: The `enrich()` method introduces metric mutation which overlaps with the metric container alignment proposal. Coordination needed.

---

### Solution B: Dialect as Metric Mutation Strategy Collection

**How It Works:** Instead of extending the interface hierarchy, model each domain dialect as a *collection of metric mutation strategies* — lightweight functions that match specific metric patterns and produce metric overrides. The existing `IDialect.analyze()` remains the entry point, but each dialect internally composes mutation strategies that operate on specific `MetricType` combinations. This is closer to the issue description's language: "a language dialect consists of a collection of mutation strategies that generate metric overrides."

**Key Concept:**

```typescript
// A metric mutation strategy — the atomic unit of dialect logic
interface IMetricMutationStrategy {
  /** Unique strategy identifier */
  id: string;
  
  /** Which metric types trigger this strategy */
  triggerMetrics: MetricType[];
  
  /** Test if this strategy applies to the given metrics */
  match(metrics: IMetric[]): boolean;
  
  /** 
   * Produce metric overrides.
   * Returns additions, replacements, and inheritance hints.
   */
  mutate(metrics: IMetric[]): MutationResult;
}

interface MutationResult {
  /** Metrics to add at dialect origin */
  add?: IMetric[];
  /** Hints to emit */
  hints?: string[];
  /** Inheritance rules for children */
  inheritance?: InheritanceRule[];
}

// A dialect is simply a named collection of mutation strategies
interface IMeasurementDialect extends IDialect {
  domain: string;
  strategies: IMetricMutationStrategy[];
}
```

**How Dialects Compose:**

Each dialect contributes its mutation strategies to a shared pool. The `DialectRegistry` collects all strategies from all active dialects, groups them by `triggerMetrics`, and applies matching strategies in registration order. Because strategies are atomic and independent, dialects compose naturally — a CrossFit dialect's AMRAP strategy and a Kettlebell dialect's resistance-normalization strategy both fire on the same statement if their trigger metrics match.

**Example — Kettlebell Dialect:**

```typescript
class KettlebellDialect implements IMeasurementDialect {
  id = 'kettlebell';
  domain = 'kettlebell';
  name = 'Kettlebell Dialect';
  
  strategies = [
    // Strategy: Normalize kettlebell resistance units
    {
      id: 'kb-resistance-normalization',
      triggerMetrics: [MetricType.Resistance],
      match: (metrics) => metrics.some(m => 
        m.type === MetricType.Resistance && 
        typeof m.value === 'string' && 
        /\d+\s*(kg|pood|lb)/i.test(m.value as string)
      ),
      mutate: (metrics) => ({
        hints: ['domain.kettlebell', 'equipment.kettlebell'],
        inheritance: [{ property: 'resistance', mode: 'ensure' }]
      })
    },
    // Strategy: Detect kettlebell-specific movements
    {
      id: 'kb-movement-detection',
      triggerMetrics: [MetricType.Effort, MetricType.Action],
      match: (metrics) => metrics.some(m =>
        (m.type === MetricType.Effort || m.type === MetricType.Action) &&
        typeof m.value === 'string' &&
        /swing|snatch|clean|press|turkish get.?up/i.test(m.value as string)
      ),
      mutate: (metrics) => ({
        hints: ['domain.kettlebell', 'movement.ballistic']
      })
    }
  ];
  
  analyze(statement: ICodeStatement): DialectAnalysis {
    // Delegate to matching strategies
    const allHints: string[] = [];
    const allInheritance: InheritanceRule[] = [];
    for (const strategy of this.strategies) {
      if (strategy.match(statement.metrics || [])) {
        const result = strategy.mutate(statement.metrics || []);
        if (result.hints) allHints.push(...result.hints);
        if (result.inheritance) allInheritance.push(...result.inheritance);
      }
    }
    return { hints: allHints, inheritance: allInheritance };
  }
}
```

- **Implementation Complexity**: Medium
- **Alignment with Existing Patterns**: Excellent — uses the strategy pattern already central to the codebase. Each mutation strategy mirrors `IRuntimeBlockStrategy`'s `match()`/`apply()` contract. The `analyze()` method remains the public API.
- **Testing Strategy**: Each mutation strategy tested in isolation (pure function: metrics in → result out). Dialect composition tested by registering multiple dialects and verifying combined hint output.
- **Risks**: Strategy ordering within a dialect matters when mutations interact. Need clear ordering semantics (priority-based, like runtime strategies).

---

### Solution C: Dialect Plugin System with Core + Extension Separation

**How It Works:** Define a minimal `CoreDialect` interface for the measurement foundation (units, metric types, basic normalization), and an `ExtensionDialect` interface for domain-specific patterns. A `DialectPlugin` bundles a core + extensions and registers them atomically. The `CoreDialect` defines the *measurement vocabulary* (what units exist, how they convert), while `ExtensionDialect` adds *pattern recognition* (AMRAP is a CrossFit extension, not a core concept).

```typescript
// Core: measurement vocabulary
interface ICoreDialect {
  id: string;
  /** Canonical unit mappings for this domain */
  units: UnitDefinition[];
  /** Default metric types this domain works with */
  defaultMetrics: MetricType[];
  /** Normalize a raw metric value to canonical form */
  normalize(metric: IMetric): IMetric;
}

// Extension: pattern recognition (current IDialect role)
interface IDialectExtension {
  id: string;
  /** Which core dialect this extends */
  coreDialectId: string;
  analyze(statement: ICodeStatement): DialectAnalysis;
}

// Plugin: atomic registration unit
interface IDialectPlugin {
  core: ICoreDialect;
  extensions: IDialectExtension[];
}
```

- **Implementation Complexity**: High
- **Alignment with Existing Patterns**: Fair — introduces a new plugin abstraction layer that doesn't exist elsewhere in the codebase. The separation of core/extension is clean but adds architectural overhead.
- **Testing Strategy**: Core normalization tested with unit tests. Extensions tested same as current `CrossFitDialect` tests.
- **Risks**: Over-engineering for the initial set of 5 dialects. The core/extension split may be premature — all current dialects are simple enough to be self-contained.

---

## 4. Recommendation

**Recommended: Solution B — Dialect as Metric Mutation Strategy Collection**

This approach best matches the issue description ("a language dialect consists of a collection of mutation strategies that generate metric overrides") and aligns with the codebase's central design principle: the strategy pattern. The existing `IRuntimeBlockStrategy` contract (`match()` + `apply()`) maps directly to `IMetricMutationStrategy`'s `match()` + `mutate()`. Developers already understand this pattern from the compilation pipeline.

### Why Solution B Over A?

Solution A's `enrich()` method creates a second processing pass that overlaps with the metric container alignment proposal. Solution B folds enrichment into the existing `analyze()` call by having each dialect internally dispatch to its mutation strategies. The public interface stays clean — `IDialect.analyze()` returns `DialectAnalysis` with hints and optional inheritance rules. The internal strategy decomposition is an implementation detail.

### Why Not Solution C?

The core/extension split is premature. The five proposed dialects (Weights, CrossFit, Swimming, Running, Kettlebell) are all self-contained and don't share a meaningful "core" beyond what `MetricType` already provides. If unit normalization becomes complex enough to warrant a shared core, Solution B can evolve to extract common mutation strategies into a shared utility.

---

### Key Design Decisions

#### 1. Two-Axis Separation: Measurement vs. Language

The term "dialect" currently means two things:
- **Measurement dialect** (domain): CrossFit, Kettlebell, Running, etc. — controls *what* metrics mean.
- **Language dialect** (execution mode): wod, log, plan — controls *how* blocks execute.

These are orthogonal. A CrossFit AMRAP can be executed live (`wod`), recorded historically (`log`), or planned (`plan`). The measurement dialect determines that "AMRAP 20 mins" is a time-bounded workout with unbounded rounds; the language dialect determines whether the timer ticks in real-time or waits for data entry.

**Interface separation:**

```
IDialect (base)
├── IMeasurementDialect (domain analysis + metric mutation)
│   ├── CrossFitDialect
│   ├── WeightsDialect
│   ├── SwimmingDialect
│   ├── RunningDialect
│   └── KettlebellDialect
└── ILanguageDialect (execution mode — future, per finishline/dialect-system.md)
    ├── WodDialect (live execution)
    ├── LogDialect (historical recording)
    └── PlanDialect (future planning)
```

#### 2. Core Measurement Dialects

| Dialect | Domain | Purpose | Key Mutation Strategies |
|---------|--------|---------|----------------------|
| **WeightsDialect** | `weights` | Resistance-based training fundamentals | Resistance unit normalization (lb/kg), load inheritance to children, volume calculation (sets × reps × weight) |
| **CrossFitDialect** | `crossfit` | CrossFit-specific workout patterns | AMRAP/EMOM/FOR TIME/TABATA detection (existing), WOD scoring hints, movement classification |
| **SwimmingDialect** | `swimming` | Pool and open-water workouts | Distance unit normalization (m/yd), lap counting, stroke classification, pace calculation |
| **RunningDialect** | `running` | Running and track workouts | Distance unit normalization (mi/km/m), pace/speed derivation, interval detection |
| **KettlebellDialect** | `kettlebell` | Kettlebell-specific training | KB weight normalization (kg/pood), ballistic vs. grind classification, KB-specific movement detection |

#### 3. Dialect Application Pipeline

```
Parser
  → CodeStatement { metrics[], hints? }
      ↓
DialectRegistry.processAll()
  → Measurement Dialects (in registration order):
      1. CrossFitDialect.analyze()    → hints: [workout.amrap]
      2. WeightsDialect.analyze()     → hints: [domain.weights], inheritance: [resistance→children]
      3. KettlebellDialect.analyze()  → hints: [domain.kettlebell, equipment.kettlebell]
  → Hints accumulated into statement.hints
  → Inheritance rules collected for JIT compiler
      ↓
JitCompiler.compile()
  → Strategy matching queries hints from ALL active dialects
  → BlockBuilder composes block with dialect-informed behaviors
      ↓
Language Dialect (wod/log/plan)
  → Influences behavior injection (CountdownTimer vs. DataEntryTimer)
  → Applied by strategy selection or behavior injector
```

#### 4. Dialect Composition

Multiple measurement dialects can be active simultaneously. The `DialectRegistry` processes all registered dialects in order, accumulating hints and inheritance rules. Conflicts are resolved by:
- **Hints**: Additive — all hints from all dialects are collected.
- **Inheritance rules**: Last-write-wins per property. If both `WeightsDialect` and `KettlebellDialect` define inheritance for `resistance`, the later-registered dialect's rule takes precedence.
- **Metric enrichments** (future): Follow `ORIGIN_PRECEDENCE` — all dialect-origin metrics have the same tier, with earlier registrations winning for same-type conflicts.

#### 5. Core Interfaces

```typescript
// ── src/core/models/Dialect.ts ──────────────────────────

// Existing (unchanged)
export interface IDialect {
  id: string;
  name: string;
  analyze(statement: ICodeStatement): DialectAnalysis;
}

// New: measurement dialect extension
export interface IMeasurementDialect extends IDialect {
  /** Domain identifier for grouping and query */
  domain: string;
  
  /** Metric types this dialect is capable of enriching */
  supportedMetrics: MetricType[];
  
  /** Get inheritance rules for parent→child metric cascading */
  getInheritanceRules(statement: ICodeStatement): InheritanceRule[];
}

// New: metric mutation strategy (internal to dialect implementations)
export interface IMetricMutationStrategy {
  id: string;
  triggerMetrics: MetricType[];
  match(metrics: IMetric[]): boolean;
  mutate(metrics: IMetric[]): MutationResult;
}

export interface MutationResult {
  add?: IMetric[];
  hints?: string[];
  inheritance?: InheritanceRule[];
}

// ── src/services/DialectRegistry.ts ─────────────────────

export class DialectRegistry {
  // Existing API preserved
  register(dialect: IDialect): void;
  unregister(dialectId: string): void;
  get(dialectId: string): IDialect | undefined;
  processAll(statements: ICodeStatement[]): void;
  
  // New: typed access
  getMeasurementDialects(): IMeasurementDialect[];
  getDialectsByDomain(domain: string): IMeasurementDialect[];
  getActiveInheritanceRules(statement: ICodeStatement): InheritanceRule[];
}
```

---

### Implementation Steps

1. **Define `IMeasurementDialect` interface** in `src/core/models/Dialect.ts`:
   - Extends existing `IDialect` with `domain`, `supportedMetrics`, `getInheritanceRules()`
   - Add `IMetricMutationStrategy` and `MutationResult` types
   - Keep `IDialect` unchanged for backward compatibility

2. **Create dialect directory structure**:
   ```
   src/dialects/
   ├── index.ts                    (barrel exports)
   ├── CrossFitDialect.ts          (refactored to IMeasurementDialect)
   ├── CrossFitDialect.test.ts     (existing tests preserved)
   ├── WeightsDialect.ts           (new)
   ├── WeightsDialect.test.ts      (new)
   ├── SwimmingDialect.ts          (new)
   ├── SwimmingDialect.test.ts     (new)
   ├── RunningDialect.ts           (new)
   ├── RunningDialect.test.ts      (new)
   ├── KettlebellDialect.ts        (new)
   ├── KettlebellDialect.test.ts   (new)
   └── mutations/                  (shared mutation strategies)
       ├── index.ts
       ├── UnitNormalization.ts     (lb/kg/pood/mi/km/m/yd conversion)
       └── MovementClassification.ts (ballistic/grind/cardio taxonomy)
   ```

3. **Refactor `CrossFitDialect`** to implement `IMeasurementDialect`:
   - Add `domain: 'crossfit'`
   - Add `supportedMetrics: [MetricType.Action, MetricType.Effort, MetricType.Duration, MetricType.Rounds]`
   - Extract AMRAP/EMOM/FOR TIME/TABATA detection into named `IMetricMutationStrategy` instances
   - Implement `getInheritanceRules()` (e.g., EMOM timer duration inherits to children)
   - Existing tests pass unchanged

4. **Implement core measurement dialects** (Weights, Swimming, Running, Kettlebell):
   - Each dialect defines its `domain`, `supportedMetrics`, and mutation strategies
   - Each dialect has co-located tests following `CrossFitDialect.test.ts` patterns

5. **Extend `DialectRegistry`** with typed access methods:
   - `getMeasurementDialects()` — filter registered dialects by `IMeasurementDialect` type guard
   - `getDialectsByDomain(domain)` — lookup by domain string
   - `getActiveInheritanceRules(statement)` — collect inheritance rules from all measurement dialects
   - Existing `processAll()` unchanged — measurement dialects' `analyze()` already works

6. **Wire inheritance rules into JIT compiler**:
   - After `dialectRegistry.processAll()`, collect inheritance rules
   - Pass inheritance rules to `BlockBuilder` for parent→child metric promotion
   - This leverages the already-defined but unused `InheritanceRule` type in `DialectAnalysis`

7. **Update exports** in `src/dialects/index.ts` to include new dialects

### Testing Strategy

| Category | Test Cases |
|----------|-----------|
| **CrossFit refactor** | Existing tests pass unchanged after refactoring to `IMeasurementDialect` |
| **Weights dialect** | Resistance normalization (lb/kg), load inheritance to children, volume hints |
| **Swimming dialect** | Distance unit normalization (m/yd), lap detection, stroke classification |
| **Running dialect** | Distance normalization (mi/km), pace hint generation, interval detection |
| **Kettlebell dialect** | Weight normalization (kg/pood), movement classification, equipment hints |
| **Dialect composition** | Multiple dialects active on same statement; hint accumulation; inheritance rule merging |
| **Registry typed access** | `getMeasurementDialects()` filters correctly; domain lookup works |
| **Backward compatibility** | Plain `IDialect` implementations still work; existing `JitCompiler` flow unchanged |

---

## 5. Validation & Next Steps

- [ ] Review this brainstorm analysis for completeness and alignment with project goals
- [ ] Validate that the two-axis model (measurement vs. language dialect) matches the intended architecture
- [ ] Confirm the five core measurement dialects cover the priority fitness domains
- [ ] Decide whether `IMetricMutationStrategy` should be a public interface or an implementation detail
- [ ] Determine ordering semantics for inheritance rule conflicts across dialects
- [ ] Coordinate with Metric Container Alignment brainstorm (metric enrichment at dialect origin)
- [ ] Create a Plan issue using `.github/ISSUE_TEMPLATE/plan.md` to transition to implementation planning
- [ ] Update `docs/finishline/dialect-system.md` to reference the two-axis dialect model

---

## 6. Alternatives and Edge Cases

### Simpler Alternative Considered

The simplest approach would be to add new dialect classes (one per domain) that all implement the existing `IDialect` interface without any interface changes. Each dialect's `analyze()` returns domain-specific hints, and the `CrossFitDialect` pattern is duplicated for each domain. This works for hint generation but does not address metric mutation, inheritance, or composability — the core requirements of the issue.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Conflicting domain dialects**: CrossFit + Kettlebell both claim `resistance` inheritance | Last-registered dialect wins for same-property inheritance. Document recommended registration order. Alternatively, introduce priority on `InheritanceRule`. |
| **Unknown domain vocabulary**: Parser produces `Effort="Turkish Get-Up"` but no dialect recognizes it | No hints added. Fallback behavior unchanged — statement compiled by generic strategies. |
| **Multi-domain statement**: `"10x32kg KB Swings"` in a CrossFit context | Both KettlebellDialect and CrossFitDialect fire. Kettlebell adds `domain.kettlebell` + equipment hints; CrossFit may add nothing (not a named WOD pattern). Hints accumulate. |
| **Empty metrics**: Statement with no parseable metrics | All dialects return empty hints. `analyze()` is null-safe (CrossFitDialect already handles this). |
| **Language dialect interaction**: wod vs. log mode affects metric interpretation | Measurement dialects are unaware of language dialect. They produce the same analysis regardless of execution mode. The language dialect influences *behavior injection* at the strategy/builder layer, not metric interpretation. |
| **Unit ambiguity**: `"100"` without explicit units — is it lbs, kg, meters? | Dialects do not guess. Unit enrichment only fires when explicit unit indicators are present. Parser-origin metrics pass through unmodified unless a dialect mutation strategy explicitly matches. |

### Performance Implications

- Adding 4 new measurement dialects means 5 `analyze()` calls per statement instead of 1. Each call is O(n) over metrics (typically < 10 per statement). Negligible impact.
- Mutation strategies use simple regex/string matching — same complexity as existing `CrossFitDialect.hasKeyword()`.
- No changes to the hot path (timer tick, block push/pop). Dialect processing happens once during compilation, not during execution.

### Feature Interactions

| Feature | Interaction |
|---------|-------------|
| **Metric Container Alignment** (brainstorm) | Dialect metric enrichments need a `'dialect'` origin in `ORIGIN_PRECEDENCE`. Coordinate new origin tier. |
| **Execution-mode dialects** (finishline) | Orthogonal. Measurement dialects produce the same analysis for wod/log/plan. Language dialect is a separate axis. |
| **Metric Promotion** (implemented) | `InheritanceRule` from measurement dialects feeds into `MetricPromotionBehavior`. Rules are consumed by `JitCompiler` during child compilation. |
| **Query Language** (brainstorm) | Queries can filter by `domain.*` hints to find exercises from specific domains. |
| **Comprehensive Runtime Tests** (finishline) | Test matrix expands: each measurement dialect × language dialect × statement pattern. Use `WorkoutTestHarness` with configurable `DialectRegistry`. |
