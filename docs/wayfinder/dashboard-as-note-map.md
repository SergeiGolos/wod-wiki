---
labels: [wayfinder:map]
title: "Dashboard-as-Note — remaining open work"
map: "#744"
open_tickets: ["#744 (map)", "#745", "#751"]
status: "In progress — package layer done, app wiring missing"
audited: 2026-09-01
---

# Wayfinder Map — Dashboard-as-Note (#744)

## Already delivered in this wayfinder (closed / landed)

- Locked dashboard-note format (`#899`): `packages/wql/src/dashboard/model.ts` —
  `DASHBOARD_WIDGET_TYPES`, `isDashboardWidgetType`, `unknownWidgetTypeMessage`,
  token extraction, span validation.
- State-free renderer: `packages/ui/src/widgets/DashboardView.tsx` (token
  controls, injected query executor, unknown-widget/error badges) and
  `DashboardTokenControls.tsx`.
- Inline renderer: `packages/ui/src/blocks/QueryBlockView.tsx` with
  unknown-widget-type detection.
- App-side note parser/scaffold: `apps/playground/src/lib/dashboard/model.ts`,
  `/dashboard/:slug` routes; `seeds.test.ts` validates the six notes under
  `markdown/dashboards/` (benchmark-pr-board, road-to-560-total,
  recovery-readiness, polarized-base-marathon, finger-strength-v8,
  training-block-review).

**The missing seam:** `DashboardView` / `QueryBlockView` have zero consumers in
`apps/playground` — dashboard blocks do not render inside note surfaces today.
Everything below depends on that wiring landing first.

## Still open — what each ticket would change

### #745 — Prebuilt dashboard library in Collections (one-click install)

- Today: `markdown/collections/` holds workout notes only; the Collections
  surface has no dashboard section and no install affordance (grep "Install":
  zero hits). Dashboards are reachable only via the six seeded `/dashboard/:slug`
  routes.
- Change if done: Collections gains a prebuilt dashboard catalog — the six seed
  notes become an installable library. Installing copies a dashboard note into
  the user's collection, where it renders through the (to-be-wired) note-surface
  dashboard renderer. Turns dashboards from developer-seeded routes into
  user-installable content.

### #751 — Dashboard block validation + plain-language paste failures

- Today: validation primitives exist in the package layer
  (`unknownWidgetTypeMessage`, `resolveWidgetType`, span errors, error badges in
  `WidgetChart`/`DashboardView`), but the note editor neither renders nor
  validates pasted dashboard blocks — a bad paste degrades to raw markdown with
  no explanation. No "Copy dashboard source" affordance exists.
- Change if done: pasting dashboard markdown into any note yields
  plain-language validation failures naming the offending block/widget, and
  existing dashboards gain a copy-source action for share/edit round-trips.
  Surfaces the already-built package validation to users.

## Next step

Land the note-surface query-block wiring (`DashboardView` consumed by the
playground note renderer). It unblocks the app halves of both open tickets.
