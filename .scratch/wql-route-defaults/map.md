# Wayfinder map: Route WQL defaults settings

Labels: wayfinder:map

## Destination

The playground has a working Settings sub-page where, per route (library family `/journal` `/collections` `/feeds` `/library`, `/efforts`, `/results` `/results/segments`, and the ⌘K palette), the user can override the default WQL query and the option lists behind the source dropdown and Group-By control — persisted client-side, falling back to read-only in-code system defaults, with empty option values nudging but never blocking. Landed as merged code, not just a spec.

## Notes

- **Plan-and-build effort**: per the destination, execution is carried inside this map (override of the usual decisions-only default). Decision tickets come first; build tickets graduate from fog.
- **Existing seams** (recon 2026-09-14): per-route defaults live in `StreamProfile` (`apps/playground/app/views/stream/streamProfile.ts` — `defaultWql`, `typeOptions`, `PROFILES_BY_ROUTE`, `resolveStreamProfile`); `QueriableStreamView` seeds `useComposerQueryState` with `profile.defaultWql` only when the URL has no `?q=`. Settings uses a sub-route pattern (`/settings/appearance`, `/settings/system`, `/settings/library/calcs` in `apps/playground/app/pages/SettingsPage.tsx` + `App.tsx:454-457`). Per-route localStorage precedent: `wodwiki.viewSettings.v1` + `/<route>` (`apps/playground/app/lib/viewSettingsStorage.ts`). ⌘K palette seeds `find:note` at `App.tsx:145-158` / `app/services/wqlSearchSource.ts:96-98`. "Quick edit pill" = the composer's click-to-edit clause pill (`TokenSlotPill`, `packages/ui/src/composer/QueryPalette.tsx`).
- **Standing decisions** (charting grilling, rounds 1–2): config is client-side only; system defaults stay in code, read-only in the UI (reset = discard user config); an empty option value nudges but never blocks running the query; configurable vocabulary is the source dropdown + Group-By list only; design as an override layer over `StreamProfile`; results family is included; palette included.
- **Naming guard**: do not call the user config a "profile" — that name is taken by `StreamProfile`. See `apps/playground/CONTEXT.md`.
- Skills per ticket type: grilling + domain-modeling for decision tickets; prototype for UI-shape tickets; frontend-design when the settings page takes real form.

## Decisions so far

<!-- index: one line per closed ticket; detail lives in the ticket -->

- [Config schema and resolution semantics](issues/01-config-schema-and-resolution.md): per-field override record in localStorage `wodwiki.routeWql.v1/<routeId>`; resolution `?q=` > config > system default; empty array = deliberate no-options state; parse-gated saves; `/results/:resultId` factory-only.
- [Settings sub-page shape](issues/02-settings-subpage-shape.md): shipped as the `/settings/queries` tab — per-route cards, read-only system defaults, custom option-list toggles, per-route reset (first-pass prototype artifact).
- [Palette default override](issues/04-palette-default-override.md): palette config replaces only the seeded query; option lists not configurable for the palette (no consumers); secondary `find:block` dispatch unchanged.

## Not yet specified

- Per-option empty-value nudge (pill-level highlight/diagnostic) — hangs off the open "Empty-option nudge UX" ticket; the current schema/editor cannot express an option with no value (blanks dropped by design), so that decision reshapes schema + editor together.

Implementation landed on branch `wql-fix`: config lib + tests, `/settings/queries` tab, profile overlay at the stream-mount seam, palette seed override, Group-By wiring in the view settings dialog, landing nudge, glossary terms in `apps/playground/CONTEXT.md`.

## Out of scope

- `/dashboard` and `/dashboard/:slug` defaults, home showcase queries, and the explorer examples catalog — excluded from the destination in charting round 1.
- Suggested filter values (value lists offered when adding filter pills) — cut in charting round 2; only source dropdown + Group-By are configurable.
- Backend sync or file export/import of the config — client-side only per round 1.
- Canvas/note query-fence defaults (`QueryBlockView`) — editor surface, not a route landing.
