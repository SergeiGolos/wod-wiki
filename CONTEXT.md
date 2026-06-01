# WOD Wiki — Domain Context

The shared language for parsing, executing, and analyzing workouts written as Markdown.
Terms here are the canonical names; prefer them over the listed aliases.

## Language

### Statement & metrics

**Metric**:
A typed, origin-stamped fact about a workout — the atomic currency of the system. Plan,
reality, and insight are all expressed as Metrics, differentiated by **Origin** and type.
_Avoid_: fragment (legacy), measurement, datapoint.

**Statement**:
One structural node of a parsed workout (`CodeStatement`). A `wod` block parses into a
tree of Statements; each owns a metric collection.
_Avoid_: node, line, fragment.

**Origin**:
The stage that produced a Metric: `parser`, `dialect`, `compiler`, `runtime`, `user`,
`analyzed`. Drives precedence (which Metric wins for display).
_Avoid_: source, producer (ambiguous).

**Ownership Layer**:
The five-tier resolution key the metric ownership ledger uses to decide visibility:
`parser → dialect → user-plan → runtime → user-entry` (low→high). Distinct from
**Origin**, which carries finer producer detail.
_Avoid_: precedence tier, rank (use when describing the numeric form only).

**Hint**:
A semantic marker emitted by a **Dialect** or the parser, expressed as a
`MetricType.Hint` metric whose value is a dot-namespaced string (`workout.amrap`,
`behavior.required_timer`). Read with `hasHint` / `getHints`. Hints flow through the
single metric channel but are excluded from display, block fragments, and labels.
_Avoid_: tag, flag, semantic token. **Never** a `Set<string>` side-channel (removed).

**Suppressor**:
A Metric carrying `action: 'suppress'`, instructing the ownership ledger to hide all
Metrics of its type. The only live `MetricAction`.
_Avoid_: hidden metric, override.

### Units of measurement

**Unit**:
A recognized measurement token (`kg`, `m`, `mile`, `cal`, `pood`) with a canonical
spelling and a set of acronyms/aliases (`lb`/`lbs`/`pound`). Units are **not** a parser
concept — the parser emits bare Number and Text; a **Dialect** identifies them.
_Avoid_: suffix, measure.

**Dimension**:
The physical quantity a **Unit** measures: `length`, `mass`, `energy`, `count`, `time`.
Drives which Metric a fused number+unit becomes (length→Distance, mass→Resistance…).
_Avoid_: category, kind, unit type.

**Unit Registry**:
The core catalog (`src/core/metrics/units/`) of every base **Unit**, its **Dimension**,
and its aliases. Pure, importable data + lookup. **Dialects import unit sets from it**;
the parser never touches it.
_Avoid_: unit table, unit map, lexicon.

**Fusion**:
The rewrite that turns an adjacent bare Number + Text (`Rep(100)` + `Effort("m Run")`)
into a dimensioned Metric + residual Effort (`Distance(100, m)` + `Effort("Run")`),
driven by a **Unit Registry** set. Logic lives in one shared pass; *which* units it
recognizes is a **Dialect** choice.
_Avoid_: merge (overloaded), parsing.

### Dialect & runtime

**Dialect**:
A composable analyzer (`IDialect`) that recognizes a domain's patterns (CrossFit,
Cardio, Yoga…), contributes a **Unit** set, and emits **Hint** markers plus
domain-specific Metrics. Dialects never execute.
_Avoid_: parser plugin, ruleset.

**Dialect Stack**:
The ordered list of configured Dialects (`1..n`) each line is processed through, in
order: a base **Units Dialect** first, then sport Dialects that compute *expecting*
fused units, then a personal-overrides Dialect last. Later Dialects observe earlier
Dialects' output (the `DialectRegistry` mutates the **Statement** in place).
_Avoid_: pipeline, chain, middleware.

**Strategy**:
A priority-ranked compiler rule (`IRuntimeBlockStrategy`) that decides which
**Behaviors** a runtime block receives.
_Avoid_: rule, handler.

**Behavior**:
A composable capability (`IRuntimeBehavior`) attached to a runtime block (timing,
rounds, sound, reporting).
_Avoid_: component, aspect (legacy in code), plugin.

**Block**:
A runtime execution unit (`IRuntimeBlock`) compiled from one or more Statements.
_Avoid_: node, step.

## Relationships

- A **Statement** owns many **Metrics**; each Metric has exactly one **Origin**.
- An **Origin** maps to exactly one **Ownership Layer**.
- A **Dialect** emits **Hint** Metrics (and domain Metrics) onto a **Statement**.
- A **Strategy** assigns **Behaviors** to a **Block** compiled from **Statements**.
- A **Hint** is a **Metric** (type `Hint`); it is never a separate channel.
- A **Unit** belongs to one **Dimension**; the **Unit Registry** is its catalog.
- A **Dialect** imports a **Unit** set from the **Unit Registry** and **Fusion**
  applies it; the **Dialect Stack** composes these sets in order (later wins).
- The parser is **Unit**-free: it emits bare Number + Text; **Fusion** (a Dialect
  concern) turns them into dimensioned Metrics.

## Example dialogue

> **Dev:** "Where does the EMOM-ness of a line live now — on the Statement's hints set?"
> **Maintainer:** "There's no hints set anymore. The CrossFit **Dialect** emits a
> **Hint** Metric with value `workout.emom`. The interval **Strategy** reads it with
> `hasHint`, and the ownership ledger keeps it out of the display Metrics."

## Flagged ambiguities

- "fragment" was used for both **Metric** (the data) and parser primitives — prefer
  **Metric** for the model type.
- "hint" was both a `Set<string>` channel and a concept — resolved: a **Hint** is a
  **Metric** of type `Hint`; the Set channel is gone.
