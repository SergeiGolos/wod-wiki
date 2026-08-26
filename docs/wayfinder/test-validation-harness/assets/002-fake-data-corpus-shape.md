# Fake-data Corpus Shape — Spec (v1)

Decided in [Fake-data corpus shape](../tickets/002-fake-data-corpus-shape.md).
The contract ticket 005 (seeding) and 010 (golden cutover) implement.

## Canonical unit

One unit = one **journal**: a JSON file of **UnifiedEventRecord** rows
(`packages/core/src/types/storage.ts:198`) in the live store shape — scenarios
and stories query exactly what production queries. No legacy fact-set, no
notes/logs derivation (parser fixtures own that layer).

```json
{
  "$schema": "https://wod-wiki.dev/corpus/v1.json",
  "kind": "event-journal",
  "id": "crossfit-multi-week",
  "title": "CrossFit multi-week block",
  "description": "Fran / S&S style strength+gymnastics, 6 weeks, tagged.",
  "records": [ { "…UnifiedEventRecord…": "" } ]
}
```

- `id` is kebab-case and equals the filename (`crossfit-multi-week.json`).
- Envelope mirrors the golden fixture's `$schema`/`kind`/provenance idiom.
- Summary rows carry `metrics: [{ type, value, unit?, metadata: {
  canonicalKey, effortSlug?, effortDiscipline?, effortIntensityTier? } }]`
  (the stored shape the SELECT leg reads — see `QueryService.test.ts`'s
  `fact()` for the authoring pattern); event rows use `grain: 'event'`.

## Location & consumption

- Catalog: `packages/wql/fixtures/corpus/*.json` — the query package owns
  query-domain data; mirrors `packages/engine/fixtures/golden/` (unpublished,
  outside `src/`, excluded from dist).
- wql vitest: fs-reads the catalog (node env).
- Storybook: vite-imports by relative path (monorepo fs.allow covers it) —
  no loader package, no app→package-reverse imports.
- **No shared loader/slicing API**: queries themselves slice (`rows:note{…}`,
  time windows). A scenario references a journal by `id` and seeds the whole
  journal into `inMemoryEventStore`; a thin fs-read + invariant check helper
  lives in wql's tests (005) — consumer sides read JSON directly.

## Golden fixture fate — absorb

The legacy fact-set golden (`multi-week-journal.json`, byte-duplicated in
`packages/engine/fixtures/golden/` and `apps/storybook/fixtures/golden/`) is
**superseded**: its 4-week Fran / 5k-run / S&S content regenerates as a
corpus journal. Cutover (ticket 010, after 005):

1. Engine CLI corpus loader (`packages/engine/src/cli/query.ts`
   `loadQueryData`) accepts `kind: "event-journal"` payloads.
2. Engine parity tests (`packages/engine/tests/parity.test.ts`) point at the
   corpus; the legacy fact-set ingestion path keeps whatever inline unit
   coverage exists — cutover verifies, doesn't silently drop, that pin.
3. Storybook `LanguageWorkbench` story + test consume the corpus via
   `inMemoryEventStore(records)` (dropping the `inMemoryFactStore` legacy
   adapter and its `as never[]` casts).
4. Both golden copies deleted.

## Catalog plan (four journals, seeded in 005)

| Journal | Content | Covers |
|---|---|---|
| `crossfit-multi-week` | Fran / S&S style strength+gymnastics, 6+ weeks, tags (`crossfit`, `girl-wods`), effort slugs, intensity tiers | aggregates, `by` dimensions, `.rollup` windows, negation/OR tag filters |
| `endurance-block` | running/rowing monostructural, distance/pace metrics, steady weekly volume | distance/pace canonical keys, `week` buckets, discipline filters |
| `mixed-wellness` | workout notes + user-authored wellness summaries (sleep, rpe), sparse weeks | `grain` discrimination, missing units, wellness-vs-workout shapes |
| `climb-yoga` | climb grades + send types via climb dialect, yoga/habits sessions | climb/yoga disciplines, edge metrics, tag vocabulary breadth |

All 10 disciplines from the vocabulary (`bodyweight`, `cycling`, `gymnastics`,
`kettlebell`, `recovery`, `rowing`, `running`, `strength`, `swimming`,
`walking`) appear somewhere; `climb`-dialect metrics ride `climb-yoga`.

## Invariants (enforced by 005's helper tests)

- Record ids unique and well-formed per the id grammar
  (`resultId:seq` events, `resultId:summary:metricKey[:k=v…]` summaries).
- Referential integrity: every `resultId`/`noteId`/`blockContentId` resolves
  within the journal.
- Timestamps non-decreasing per result; `grain`/`outputType` values legal.
- Envelope `id` matches filename; JSON parses; no unknown envelope keys.
