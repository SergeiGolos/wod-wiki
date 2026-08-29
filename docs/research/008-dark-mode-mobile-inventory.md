# 008 — Dark-mode & mobile breakage inventory

Wayfinder ticket: [#991](https://github.com/SergeiGolos/wod-wiki/issues/991) · Map: [#990](https://github.com/SergeiGolos/wod-wiki/issues/990)
Date: 2026-08-28 · Audited at `main` = `e9157d17`

## Method

Two passes, evidence-linked:

1. **Code sweep** — lines carrying raw Tailwind palette classes (`bg-white`, `zinc-*`, `amber-*`, …) with no `dark:` counterpart on the same line (tests excluded). Line-level heuristic: multi-line `className` template literals can pair across lines; verify per case during execution.
2. **Headless Chromium audit** — 375×812, light + dark, over 8 Storybook stories (`?globals=theme:dark`) and 6 playground routes (theme forced via the `wod-wiki-playground-theme` storage key). Probes per surface: document horizontal overflow (`scrollWidth − clientWidth`), per-element right-edge overflow, light-background islands in dark mode (computed background luminance > 0.82 on elements > 15 000 px²), theme-class application. Screenshot per surface.

Serving notes: storybook via `apps/storybook/storybook-static`; playground `dist` needs an SPA-fallback server (`vite preview` is https-only here; a plain `http.server` 404s non-file routes).

## Headline findings

### H1 — Storybook dark mode never flips the palette (critical · fix class: theme bridge)

The `preview.tsx` theme toolbar works — the decorator div gets the `dark` class — but **every story still renders light**. Verified on workbench-for-time, workbench-fran, wql-composer, analytics-widgets, gallery-rows, gallery-table: wrapper `--background` resolves to the dark value (`222 16% 21%`) while `bg-background` computes light cream (`rgb(247,245,243)`).

**Root cause:** `packages/ui/src/styles.css` bridges tokens into Tailwind v4 via `@theme { --color-background: hsl(var(--background)); … }`. Custom-property substitution bakes the `:root` (light) value into the `--color-*` chain, which then *inherits* pre-resolved down the tree. A `.dark` class on a wrapper re-declares `--background` one level too late. The playground only works because its `ThemeProvider` toggles `.dark` on `<html>` — the same element the bridge resolves on.

**Fix direction (decision belongs to [#994](https://github.com/SergeiGolos/wod-wiki/issues/994)):** `@theme inline` in `styles.css` (utilities emit `var(--background)` directly → flips on any ancestor), or the decorator toggles `documentElement.classList`. One change fixes all stories. Secondary: the iframe `<body>` keeps light gutters behind stories in dark.

Evidence: `docs/research/assets/008/storybook-workbench-dark-toolbar.webp`.

### H2 — Session Outputs Table overflows the phone viewport (critical · fix class: shared widget)

`OutputStatementsTable` (`packages/ui/src/widgets/OutputStatementsTable.tsx`) renders 779 px wide at a 375 px viewport → **320 px document-level horizontal overflow** in the workbench stories (`playground--for-time-starter`, `workbench-benchmark-fran--standard-couplet`). The `overflow-x-auto` wrapper does not contain it: the page itself scrolls sideways, columns clip with no affordance. Confirms the user report that the new table has no usable phone view.

Same widget ships in the playground (analytics explorer + editor query blocks via `RowsTable`) with identical min-width math; page-level containment there is unverified (needs an executed `rows:` query — see Gaps). The WQL gallery rows section is worse: gallery cards 815 px → 472 px overflow.

Mobile direction already decided on the map: card list below `sm`, table ≥ `sm` (prototype ticket [#992](https://github.com/SergeiGolos/wod-wiki/issues/992)).

Evidence: `docs/research/assets/008/storybook-gallery-rows-375.webp`.

### H3 — Playground app is clean at 375 px and in dark on all probed routes (no action)

`/`, `/journal` (redirects to library empty-state), `/library`, `/efforts`, `/analytics/explorer`, `/playground/hello-world`: **zero overflow, dark fully applied, zero light islands.** The "playground seems not to support dark mode" impression does not reproduce on page-load states. Residual risk lives in interactive states not exercised here (see Gaps).

Evidence: `docs/research/assets/008/playground-efforts-dark-375.webp`.

## Code-sweep candidates (hardcoded palette, no `dark:` on line)

**`packages/ui` — shared, both hosts inherit (fix once):**

| File | Lines |
| --- | --- |
| `widgets/ZoneDistribution.tsx` | 9 |
| `widgets/OutputStatementsTable.tsx` | 7 |
| `widgets/GoalRings.tsx` | 4 |
| `blocks/RowsResultsChrome.tsx` | 4 |
| `composer/WqlComposer.tsx` | 2 |
| `extensions/widget-block-preview.tsx`, `composer/WqlDiagnosticsStrip.tsx`, `composer/QueryPalette.tsx` | 1 each |

**`apps/storybook`:** `workbench/LanguageWorkbench.tsx` (7), `WqlComposer.stories.tsx` (4).

**`apps/playground` — app surfaces (top offenders):** `CalcPreviewPanel` (11), `ParsedQueryChips` (10), `CalcDiagnosticsStrip` (9), `CalcAuthoringPanel` (9), `VisibilityBadge` (8), `LibraryPage` (8), `EffortsCatalogPage` (7), `TimerStackView` (5), `FrontmatterCompanion` (4), `PaletteShell` (4), `CommandListView` (4), `switch.tsx` (4), `PageToolbar` (4), `OnboardingBanner` (4), `MacOSChrome` (4), `App.tsx` (4), `LibraryRow` (3), `AnalyticsExplorerPage` (2). Dev-only surfaces: `testing/components/SnapshotDiffViewer` (36), `clock/components/TimerHarness` (25).

Excluded: `app/canvas/parseCanvasMarkdown.ts` (color-name strings, not classes), `app/receiver-rpc.tsx` (out of scope per map).

## Verified-clean surfaces

- Storybook light: `wql-composer--default`, `analytics-widgets--query-value-widget`, `gallery table-section` (no overflow).
- Playground: all six routes, both themes.
- Static shell chrome: `index.html` carries `dark:` pairs on `html`/`body`.

## Gaps — unverified, feed the execution tickets

- Playground **interactive states**: command palette, calc-authoring panels, timer stack, editor overlays, review grid — the sweep flags candidates; none visually probed.
- `RowsTable` inside the playground at 375 px **after executing a `rows:` query** (the storybook defect strongly implies breakage; confirm in place).
- Storybook story bodies beyond the flagship set (61 stories exist; 8 probed).
- **Cross-effort note:** `e2e/storybook.smoke.e2e.ts` still targets stale story ids — `workbench-benchmark-fran--default` and `gallery-wql-example-gallery--default` do not exist (real: `workbench-benchmark-fran--standard-couplet`, `gallery-wql-example-gallery--rows-find-section`). Full id list: storybook `index.json` at build time.

## Fix classes & suggested severity order (input to [#995](https://github.com/SergeiGolos/wod-wiki/issues/995))

1. **Theme bridge** (H1) — one config-level change unlocks dark for every story.
2. **Session Outputs Table mobile** (H2) — card list per map decision.
3. **Shared-widget token migration** — `packages/ui` palette classes → tokens (8 files).
4. **Gallery card width containment** at 375 px.
5. **App-surface polish** — mechanical `dark:` additions / token swaps in playground dialogs & panels.
