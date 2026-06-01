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

### Dialect & runtime

**Dialect**:
A pure analyzer (`IDialect`) that recognizes a domain's patterns (CrossFit, Cardio,
Yoga…) and emits **Hint** markers plus domain-specific Metrics. Dialects never execute.
_Avoid_: parser plugin, ruleset.

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
