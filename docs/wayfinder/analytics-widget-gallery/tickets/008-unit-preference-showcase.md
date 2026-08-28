---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Unit-preference showcase — is kg/lb a coverage axis?"
blocked-by: []
---

## Question

Graduated from the map's fog when the manifest locked without a units axis
(ticket 003). The gallery's live cards run through `QueryService` with a
`preferredUnit` option and WQL's `in <unit>` directive
(`WQL_DISPLAY_UNITS: kg | lb`). Decide:

1. Does the gallery demonstrate unit conversion at all — e.g. one card
   pair showing the same query in kg and lb, or a kg/lb toggle on cards
   that carry weight-dimensional metrics (totalVolume, distance-pace)?
2. If yes: is units a **coverage axis** (the manifest test demands at
   least one converted card) or a one-off showcase card?
3. If no: record it as chrome-out-of-scope and close the question for
   good — the app-side unit preference lives in `useAnalyticsUnitPreference`,
   not the gallery.

Blocks [Aggregate widget sections](004-aggregate-widget-sections.md) —
the manifest array's shape (does a card carry a `preferredUnit` field?)
settles here first.

## Resolution

Spec: [003 asset §D6](../assets/003-gallery-architecture-and-coverage-manifest.md)

One-line answer: **units are a coverage axis** — the card schema gains
optional `preferredUnit: 'kg' | 'lb'` plumbed through
`service.run(parsed, { preferredUnit })`; the manifest carries a
same-query pair, `sum:totalVolume{}` default (renders first-source
**lb**, 53,775) vs `preferredUnit: 'kg'` (≈24,389 kg via
`KG_PER_LB`), and the coverage test enforces ≥1 preferred-unit card.
Correction over the draft: fixture facts are lb-denominated (no kg rows
exist in any journal), so the honest demo is lb-default → kg-preferred,
not the reverse; conversion is family-scoped (`units.ts`: mass kg↔lb,
distance m↔km) and passes unknown-unit values (rep, pts, AU) through
unchanged.
