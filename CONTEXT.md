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
One structural node of a parsed workout (`CodeStatement`). A `wod` (or `whiteboard` aliased) block parses into a
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

**Choice Group**:
A single `MetricType.Choice` Metric (`ChoiceGroupMetric`) emitted by **Fusion** when
a slash (`/`) separates two homogeneous alternatives of the **same** Metric type
(e.g. `185/125 lb` → two `Resistance` options; `Run/Walk` → two `Effort` options).
Carries `alternatives: IMetric[]` at `origin: 'parser'`. Slash between *different*
Metric types is silently dropped — no Choice Group is emitted.
Resolved in the **Pre-Run Wizard** before the JIT compiles: the user picks one
alternative (first is pre-selected); the chosen metric is written at `origin:
'user-plan'` into the same Statement's `MetricContainer`, shadowing the group.
Never surfaces in compiled Blocks or display output once resolved.
_Avoid_: slash metric, OR metric, option group.

**Choice Collapse**:
The act of writing a **Choice Group**'s selected alternative back into its Statement
at `origin: 'user-plan'`, owned solely by `ChoiceResolution`
(`src/runtime/compiler/metrics/ChoiceResolution.ts`). Idempotent — re-selecting
replaces the prior user-plan pick rather than accumulating. Two seams drive it: the
**Pre-Run Wizard** (user selection, via the `resolveChoiceSelection` hooks facade)
and `RuntimeFactory.createRuntime`, which calls `collapseUnresolvedChoices` as the
enforced safety net — defaulting any still-unresolved group to its first alternative
**before the runtime spins up its first Block**, so a `MetricType.Choice` can never
reach a compiled Block on any entry point.
_Avoid_: resolve (overloaded with ownership resolution), pick.
### Persistence & storage
**Storage**:
The raw per-store layer below Persistence. A typed interface (`IStorage`,
`src/services/storage/IStorage.ts`) with operations keyed by **Store Name**
(`notes`, `segments`, `results`, `attachments`, `analytics`, `efforts`):
`readonly(store).get/getAll/getAllFromIndex`, `readwrite(store).put/delete`,
and `transaction(stores)` for cross-store atomic work. The interface is
parameterized by store name so callers and tests cross the same seam
without knowing which engine backs it. Schema (stores, key paths, indexes)
lives in the **Storage Adapter**, not the interface.
_Avoid_: database, table, repository (in the data-access sense).
**Storage Adapter**:
A concrete `IStorage` implementation. Two adapters ship in-tree:
`IndexedDBStorage` (production, over `idb`) and `InMemoryStorage` (test
default, pure `Map`-backed). Adapters own the schema, the open/close
lifecycle, and the per-store keying rule. Tests construct a fresh
`InMemoryStorage` per case — no IndexedDB globals, no `fake-indexeddb`,
no shared state.
_Avoid_: backend, store implementation, persistence impl.
**Persistence**:
The domain layer above Storage. `IndexedDBNotePersistence` exposes
`getNote / listNotes / mutateNote / deleteNote` for the Note
domain; it depends on the `NotePersistenceStorage` interface, which the
Storage layer satisfies. Persistence adapters compose raw **Storage**
calls into domain operations (latest-version lookup, cascade delete,
analytics write) — they do not embed engine specifics.
_Avoid_: data layer, store (overloaded).
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

- A **Dialect** imports a **Unit** set from the **Unit Registry** and **Fusion**
  applies it; the **Dialect Stack** composes these sets in order (later wins).
- The parser is **Unit**-free: it emits bare Number + Text; **Fusion** (a Dialect
  concern) turns them into dimensioned Metrics.
- A **Storage Adapter** satisfies **Storage** for one engine; **Persistence**
  composes **Storage** calls into domain operations; domain code depends on
  **Persistence**, not on a concrete adapter.