# 04 — Dashboard note → block-local query documents

Status: **Proposed — not implemented.** Proposed types and code below are
illustrative sketches, not accepted decisions. Anchored in [issue 17 — Query
documents, formulas, and attached
calculations](../issues/17-query-documents-and-formulas.md) and the [query
documents contract](../assets/query-documents-contract.md); unit behavior
inside documents follows [02 — Shared unit recognition and
conversion](02-unit-policy.md).

## Intent

A dashboard note's ```query block is currently a **single query line plus
trailing `/`-separated positional params**. The query-documents contract
upgrades each block to a self-contained **QueryDocument**: optional `defaults`,
named query/formula assignments, explicit `show`, block-local scoping, host
tokens entering as explicit parameter bindings. This document verifies the
actual dashboard module and its playground fork, traces one real widget through
the current model, sketches the block-local document shape with the host layer
kept separate, and records the two sharp edges that must not be smoothed over:
the legacy `/` positional-params split (vs slash division in formulas) and the
single-"body line" extraction that silently truncates multi-line blocks.

## Verified current files and forks

The format lives in `packages/wql/src/dashboard/` (`model.ts` 364 lines,
`parser.ts` 137, `scaffold.ts` 29, `frontmatter.ts` 180, re-exported from the
package root). The playground carries a fork at
`apps/playground/src/lib/dashboard/` (`model.ts`, `parser.ts`, `scaffold.ts`,
plus `noteOps.ts` 277 lines with **no wql counterpart**). Verified by diff:

- **model.ts** — identical except two drifts: the playground fork imports
  `WQL_CALC_TARGETS` from `@bitcobblers/wod-wiki-engine` while wql imports its
  own `../vocabulary` (`packages/wql/src/vocabulary.ts:55`; engine re-exports it
  at `packages/engine/src/index.ts:274`); and `isDashboardMeta` — the fork at
  `apps/playground/src/lib/dashboard/model.ts:140` accepts only
  `meta['dashboard'] === 'true'`, while wql at
  `packages/wql/src/dashboard/model.ts:139` additionally accepts boolean
  `true`. **The fork is already stale**, which is what forks do.
- **parser.ts** — identical once the frontmatter import path is normalized
  (`./frontmatter` vs `../frontmatter`); zero behavioral diff.
- **scaffold.ts** — identical code; the fork carries an extra doc comment about
  the creation flow only.
- **Runtime callers:** production widgets use the wql package. The playground fork also has live callers under `apps/playground/app`, which must not be omitted from searches: [DashboardViewPage](../../../../apps/playground/app/views/dashboards/DashboardViewPage.tsx#L34) imports its parser/model/noteOps; [WidgetComposerDialog](../../../../apps/playground/app/views/dashboards/WidgetComposerDialog.tsx#L34) imports its model; [QueryToDashboardDialog](../../../../apps/playground/app/views/analytics/QueryToDashboardDialog.tsx#L19) imports noteOps/scaffold; [dashboardNotes](../../../../apps/playground/app/services/dashboardNotes.ts#L13) imports scaffold. Both module copies participate in the dashboard path today. Moving only tests would leave production callers behind.
- **noteOps is genuinely playground-only** and is *not* wrapper/barrel weight:
  it is 277 lines of identity-guarded markdown transforms
  (`apps/playground/src/lib/dashboard/noteOps.ts:148` `appendWidget`,
  `:160` `updateWidget`, plus duplicate/remove/move/resize). Its doc header
  states the load-bearing contract: operations are "identity-guarded: the
   target widget is located by its positional key … AND its expected body
  content. A guard mismatch returns null and writes NOTHING."
- **Frontmatter fork is a superset, not a duplicate**:
  `apps/playground/src/lib/frontmatter.ts` (366 lines) contains everything in
  `packages/wql/src/dashboard/frontmatter.ts` (180 lines) **plus app-only
  additions**: `extractYouTubeVideoId` (line 250), `LinkUrlSubtype` (274),
  `detectUrlSubtype` (281), `extractLinkWidgets` (296). The shared parse /
  serialize / strip / scalar / list / tags bodies are line-for-line the same
  logic. Cleanup must delete the duplicated subset and **preserve the app-only
  additions** — never delete the whole playground file.

## Current concrete data example

Current seed excerpt, [benchmark-pr-board.md:14–19](../../../../markdown/dashboards/benchmark-pr-board.md#L14-L19):

````markdown
## Benchmark scores
Which benchmarks moved this quarter?

```query:table-2
last:elapsed{tags:benchmark} by {effort}
```
````

`parseDashboardNote` (`packages/wql/src/dashboard/parser.ts:15`) sections the
raw note with line numbers; `buildDashboardDocument`
(`packages/wql/src/dashboard/model.ts:313`) associates title/question by strict
adjacency and — critically for this deepening — extracts **one body line**:

```ts
// Current excerpt — model.ts:320-327
const bodyLine =
  section.content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '' && !l.startsWith('#')) ?? '';
const { query, params } = splitWidgetBody(bodyLine);
```

`splitWidgetBody` (`model.ts:231-243`) splits at the **first ` / `**:

**Current excerpt**, [model.ts:231–242](../../../../packages/wql/src/dashboard/model.ts#L231-L242):

```ts
export function splitWidgetBody(body: string): { query: string; params: string[] } {
  const trimmed = body.trim();
  const sep = trimmed.indexOf(' / ');
  if (sep === -1) return { query: trimmed, params: [] };
  const query = trimmed.slice(0, sep).trim();
  const params = trimmed
    .slice(sep + 3)
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return { query, params };
}
```

Producing, for the seed above: `DashboardDocument { isDashboard: true,
title: 'Benchmark PR Board', tokens: [], widgets: [{ key: <section-derived key>, type: 'table',
spanCols: 2, body: 'last:elapsed{tags:benchmark} by {effort}', query: <same>,
params: [], title: 'Benchmark scores', question: 'Which benchmarks moved this
quarter?' }] }` (`DashboardWidget` at `model.ts:264`, `DashboardDocument` at
`:285`). With a params body like `max:calc.e1rm{} / $goal` the split yields
`query: 'max:calc.e1rm{}'`, `params: ['$goal']` — exercised by
`apps/playground/src/lib/dashboard/model.test.ts:308-312`. Tokens substitute as
raw text (`substituteTokens`, `model.ts:200`).

## Proposed sketch (illustrative — not decided, not runnable)

Block-local document per contract §1, host layer unchanged:

```ts
// Proposed sketch — QueryDocument (block-local, per query-documents-contract §1)
interface QueryDocument {
  defaults?: { by?: string[]; window?: string };   // below explicit query clauses, above host defaults
  assignments: Map<string, Assignment>;            // named query | named formula
  show: string[];                                  // explicit; unshown = intermediate
}
type Assignment =
  | { kind: 'query';  text: string }               // sum:distance{...} by {week} last 12w in km
  | { kind: 'formula'; expr: string; normalize?: string; outUnit?: string };
```

Same seed input, proposed widget body (multi-line document):

```text
defaults by {effort}

fran = last:elapsed{tags:benchmark}
show fran
```

Proposed trace: parser yields the full fenced body (not one line) → document
parse → `show fran` output with grouping from block `defaults`; the host
(`DashboardDocument`) keeps tokens/title/widgets exactly as today, passing
`$token` values as **parameter bindings** (contract §1.3: "never as implicit
cross-block query references"). The widget/host boundary stays where it is:
`DashboardDocument` composition, token extraction, title/question adjacency, and
grid spans are host concerns; assignment resolution, dependency order, and
cycle diagnostics are document concerns, hidden from the host.

## Risks to resolve (do not smooth over)

1. **`splitWidgetBody` vs slash division.** Legacy single-line bodies split at
   the first ` / `; documents put division *inside* formulas
   (`pace = time / dist`). A one-line document `pace = time / dist / $goal` is
   genuinely ambiguous. Proposed disposition, unresolved: multi-line bodies are
   documents (no positional split); single-line bodies keep the legacy split
   for backward compatibility; whether positional params survive at all in
   documents (vs explicit host bindings) is a contract question, not assumed here.
2. **One-body-line extraction.** `model.ts:320-327` and the noteOps identity
   guard (`noteOps.ts:101-106`, same extraction rule) both keep only the first
   non-comment line. Multi-line documents require both to compare/replace the
   **full fenced body**; until they do, every multi-line document silently
   truncates to its first line. This is a semantic change to the body-extraction
   seam both modules share.

## noteOps preservation

The operations and their guarantees survive this migration intact: group =
adjacent title/question + fence (same adjacency rule as `buildDashboardDocument`),
identity guard = positional key `w${i}` **and** expected body, null = re-read
and never write. Proposed mechanical moves only: the extraction rule in
`findWidgetGroup` compares full bodies (risk 2); `renderWidgetGroup` /
`widgetBodyLine` (`noteOps.ts:55,62`) serialize documents verbatim;
`resizeWidget` still rewrites only the fence tag line. The proposed home is beside the parser in wql's Dashboard Note Module, with live app imports and behavioral tests migrated together. Keep authoring transforms in-process; they need no Storage Adapter. This move preserves text-splice behavior, while full-body guards intentionally extend it for Query Documents.

## Deletion test and locality

Deleting the duplicate parser/model would force its live app callers to import the canonical Module; deleting the canonical Module would force all hosts to reconstruct the format. The first is duplication removal, the second demonstrates Depth. Migrate the runtime callers listed above, preserve noteOps' identity guards, and consolidate equivalent tests without dropping unique behavior coverage. Playground frontmatter retains its app-only helpers and consumes the shared parser; do not replace it with a permanent compatibility re-export layer or delete it wholesale.

**Locality**: parsing/model/note-ops each stay single-module; the document
model hides assignment resolution and cycle detection from widgets.
**Leverage**: one parser serves the editor, inline renderer, and route (the
stated purpose of the pure module, `model.ts` header); block-local scoping
means moving/editing a widget can never break another block's references —
which the positional text-splice ops exploit today.

## Incremental clean cutover

1. **Structural cutover:** migrate every live playground model/parser/scaffold/noteOps caller to the canonical wql Module, then remove the fork. Retain app-only frontmatter behavior with direct imports of shared operations. Preserve unique tests; explicitly verify the known boolean `dashboard` discrepancy rather than calling every effect behavior-preserving.
2. **Behavior-preserving**: single-query blocks parse as degenerate documents
   (contract §1.1: "zero behavior change"; issue 17 acceptance 2 — existing
   `QueryService` corpus passes unchanged).
3. **Semantic, intentional**: full-body extraction (risk 2), document grammar,
   host bindings. Legacy single-line bodies keep working via the degenerate path.
4. `isProposedMetric` string matching over query text moves to AST checks
   inside the document model (issue 17 clean cutover); no `.includes('calc.')`
   remains.

## Behavioral verification examples

- Every seed in `markdown/dashboards/*.md` parses via wql's parser and builds a
  document with identical widgets/titles/tokens (the `seeds.test.ts` pattern,
  migrated). Scaffold output byte-identical before/after the fork deletion.
- Exercise append, update, move, duplicate, resize, and remove independently against valid target widgets; unrelated bytes remain unchanged. A stale body/key guard returns null without writing. Do not resize a widget after the remove step has deleted it.
- Single-line block `max:calc.e1rm{} / $goal` executes byte-identically to
   today (degenerate document, legacy params split).
- Multi-line document with `a = b + 1; b = a + 1` yields a document-level cycle
  diagnostic; reordering definitions never changes results (issue 17 acceptance 3).
- Token reference unknown to the host still badges `unknown tokens: $x`
  (`unknownTokensMessage`) rather than silently binding.

## Tradeoffs and unresolved decisions

**Update:** every item below is now resolved by [ticket 22](../issues/22-dashboard-body-migration.md): documents everywhere with an eager data rewrite (positional params retire into fence-tag attributes), strict full-body guards, and noteOps beside the parser in wql returning structured results. Bullets remain as review context.

- **Positional params vs host bindings**: contract says tokens enter as explicit
  bindings; whether legacy ` / $goal` bodies are rewritten on migration or kept
  as a permanent degenerate form is open.
- **`show` is required for named documents.** Existing bare single-query blocks remain valid without it. Do not introduce a single-assignment exception as an implicit scope change.
- **noteOps home**: wql dashboard module vs a shared module (see above); also
  whether its null-on-guard-mismatch contract should become a structured result
  instead of `string | null`.
- **Slash ambiguity** (risk 1) needs a grammar-level decision before any
  document syntax ships; preserving legacy split behavior for one-line bodies
  is the safe default, not a settled answer.
- **Frontmatter ownership**: the app-only link-widget helpers could eventually
  move to wql too (other surfaces parse links), but that is out of scope here;
  this document only fixes the duplication.

## Siblings

- [02 — Shared unit recognition and conversion](02-unit-policy.md) — the `->
  <unit>` output policy inside document formulas.
- [Deepening index](index.md), [query presentation](05-query-presentation.md), and [query freshness](06-query-freshness.md) connect this authoring Module to execution and rendering.
- Contracts: [query documents](../assets/query-documents-contract.md),
  [arithmetic](../assets/arithmetic-contract.md); ticket: [issue
  17](../issues/17-query-documents-and-formulas.md), blocked by
  [13](../issues/13-units-and-arithmetic.md).
