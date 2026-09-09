# 14 · Command Locations by View (Desktop / Mobile)

**Status**: Reference. **Date**: 2026-09-07.
**Audience**: App.

This doc maps every page-level command to where it lives at each breakpoint,
view by view. Go to a route's section, read the row. If the code and this doc
disagree, the code wins (see the [docs README](./README.md) convention).

- **Mobile** = viewport < 1024px (Tailwind `lg`; `MOBILE_BREAKPOINT_PX = 1023`,
  `apps/playground/app/canvas/canvasUtils.ts:6`). **Desktop** = ≥ 1024px.

## 1. How commands relocate

Pages declare actions **once** via `ResponsiveActions`
(`apps/playground/app/nav/ResponsiveActions.tsx`); placement is decided by the
breakpoint:

| Surface | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Page header (`StickyPageHeader`) | Sticky top bar: title + subtitle + right-aligned actions + query bar | Hidden entirely (`max-lg:hidden`, `src/panels/page-shells/StickyPageHeader.tsx:66`); page identity = navbar breadcrumb |
| Page **primary** action | Inline in the header (first control) | Thumb-dock **FAB** (floating, bottom corner) |
| Page **children** actions | Inline in the header after the primary | Dock **⋮ overflow sheet** (lazy-mounted, ≥44px rows) |
| Cast | Header (via the page's `PageActions` bar) | **App navbar**, right side |
| Page options ⋮ — secondary nav, *On this page*, Download Markdown | Header ⋮ dropdown (nav sections hidden ≥2xl, where the secondary rail owns them) | **Thumb dock**: the ⋮ FAB sits just above the search FAB; tapping it stacks its functions as buttons in the sheet, under the page's own rows (global `fallback` registration, `app/App.tsx`) |
| Search | Header input / icon-rail button; `Ctrl/Cmd+K`, `+/`, `+P` (`app/App.tsx:161-172`) | Dedicated **search FAB** in the dock |
| WQL stream query bar | Header `queryBar` slot — full chips bar + inline composer | **Thumb footer** — full-width **button row** at the very bottom (search icon + source pill + query; `MobileQueryFooter`, `src/templates/SidebarLayout.tsx`); tap opens the same WQL palette, and the dock stack rises one row above it |

Dock mechanics (`ResponsiveActions.tsx`): corner set by *Settings →
Appearance → Actions Button Position* (right by default, mirrored left;
`app/lib/fabAlignment.ts`); rises with the on-screen keyboard and respects the
safe area; sheet collapses on route change; the most recent page registration
wins; a registration whose children render nothing (generic bars the dock
replaces) shows no ⋮ trigger. The sheet stacks the **page's own rows first**,
then the global Page options rows under a rule. The buttons **stack vertically, rising
from the thumb corner** (search FAB lowest, page primary on top), and the
whole cluster lifts above the stream pages' thumb footer via
`--thumb-dock-lift` (published by `MobileQueryFooter`).

**Location vocabulary used below**

| Term | Means |
|---|---|
| Header | Desktop sticky page header, right of the title |
| Dock FAB | Mobile floating primary button |
| Dock ⋮ sheet | Mobile "More actions" overflow: the page's own rows first, then the global Page options rows (secondary nav, On this page, Download) under a rule |
| Navbar cast | Mobile top-right header control — Cast only; the Page options ⋮ moved down into the dock |
| Thumb footer | Mobile fixed bottom **button row** hosting the WQL composer on stream pages; the dock stacks one row above it |
| Body (unchanged) | Same placement at both breakpoints |
| Desktop-only / Mobile-only | Rendered at exactly one breakpoint |

## 2. Global chrome (every route inside the app shell)

Source: `src/templates/SidebarLayout.tsx`, `app/nav/NavSidebar.tsx`,
`app/nav/AppRail.tsx`.

| Command | Desktop | Mobile |
|---|---|---|
| Global search palette | Icon-rail search button (`AppRail.tsx:79-83`) + keyboard shortcuts | Search FAB in the thumb dock |
| L1 nav (Home / Library / Dashboards / Efforts) | 56px left icon rail | Hamburger in the sticky navbar → drawer (L1 list is drawer-only, `NavSidebar.tsx`) |
| Buy Me a Coffee | Icon-rail button pinned at the bottom — under search, above Settings; opens the support page in a new tab (`AppRail.tsx`) | Drawer row (icon + label) above Settings — L1 tree entry with an `external` action (`appNavTree.ts`) |
| L2 context sidebar | 240px second column | Inside the drawer, under the L1 list |
| Page TOC / secondary nav | Right rail, ≥2xl only; below 2xl it folds into the header ⋮ menu | Dock ⋮ sheet → stacked secondary sections + *On this page* rows |
| Cast + Page options (Download Markdown) | Header controls via `PageActions` (`app/pages/shared/PageToolbar.tsx`) | Cast: App navbar. Page options: dock ⋮ → stacked rows; Download is omitted when the route has no resolved document |
| Stream query bar | Header queryBar slot | Thumb footer button row (full width, bottom; tap opens the WQL palette) |
| Content clearance | — | `max-lg:pb-48` keeps content clear of the stacked dock; the footer adds its own flow spacer |

Routes that bypass the shell entirely (no rail / navbar / dock):
`/run/:runtimeId`, `/load`, `/load/journal(/:date)`, `/settings/library/calcs`,
`/proto/calc-authoring`, `*` (404).

WQL palette internals (identical at both breakpoints): a flat **header
section above the composer** carries the valid/invalid badge and the live
"N matched" stage count, with the action buttons appended at its end: Add
calc / + Filter, **Apply query**, and (mobile only) Cancel — separated from
the composer by a primary-tinted accent line, no bubble chrome. The composer
box itself renders borderless/square (plain textarea) in this mode. The AST
summary chips (target/scope/time) are suppressed — the pills in the composer
already show that state (`WqlDiagnosticsStrip` `variant="header"` +
`hideSummary`, driven by the composer's `diagnosticsPosition="top"`; other
composer hosts keep the rounded card strip below a rounded box). The results
list renders under the composer.

## 3. Route index

| Route | Page component | Family |
|---|---|---|
| `/` | `HomeView` → `HomeTour` | [Home](#5-home-view) |
| `/guide/syntax…`, `/guide/behaviors…`, `/guide/analytics…`, `/ai-first` | `MarkdownCanvasPage` | [Guides](#6-guide-canvas-pages) |
| `/collections/:slug` | `MarkdownCanvasPage` | [Guides](#6-guide-canvas-pages) |
| `/library`, `/journal`, `/collections`, `/feeds`, `/feed`, `/results`, `/results/segments`, `/results/:resultId`, `/efforts` | `QueriableStreamView` | [Streams](#7-stream-and-library-routes) |
| `/playground/:id` | `PlaygroundNotePage` | [Note editors](#8-note-editor-pages) |
| `/journal/:date` | `JournalDatePage` | [Note editors](#8-note-editor-pages) |
| `/collections/:collection/:workout`, `/note/:category/:name` | `WorkoutEditorPage` | [Note editors](#8-note-editor-pages) |
| `/effort/:slug` | `EffortDetailPage` | [Effort](#9-effort-detail) |
| `/feeds/:feedSlug`, `/feeds/:feedSlug/:feedDate/:feedItem` | `FeedDetailPage` / `FeedItemPage` | [Feeds](#10-feed-pages) |
| `/dashboard`, `/dashboard/:slug` | `AnalyticsExplorerPage` / `DashboardViewPage` | [Dashboards](#11-dashboard-pages) |
| `/settings/appearance`, `/settings/system`, `/settings/library/calcs` | `SettingsPage` / `CalcAuthoringPanel` | [Settings](#12-settings) |
| `/run/:runtimeId` | `WallClockPage` | [Runtime](#13-runtime-and-utility-routes) |
| `/load`, `/load/journal(/:date)` | `LoadZipPage` / `JournalZipLoadPage` | [Runtime and utility](#13-runtime-and-utility-routes) |
| `/legacy`, `/proto/calc-authoring`, `*` | landing / prototype / 404 | [Runtime and utility](#13-runtime-and-utility-routes) |
| redirects only | — | [Redirect-only routes](#14-redirect-only-routes) |

## 4. Legend

All file paths are relative to the repo root. Line references were verified
against the working tree on 2026-09-07.

## 5. Home view

Route `/` — `app/views/HomeView.tsx:28-52` → `app/tour/HomeTour.tsx`. The home
route is intercepted before the generic canvas renderer (`app/App.tsx:226-231`).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Hero editor **Run** | Run button on the hero editor card (`HomeTour.tsx:892`); opens the fullscreen playground overlay (`:596-624`) | Same card; fullscreen overlay on every form factor (`:899-947`) |
| Hero **Share** | Hero editor card (`HomeTour.tsx:893`) | Same (`:922`) |
| Runway **Run / Share** (scroll demo) | Sticky `TourSectionRunway` demo window (`HomeTour.tsx:996-997`) | `TourMobileRunway` pinned window under the nav (`:909-945`); Run still opens the fullscreen overlay |
| Chapter picker **Run / Share** | "Learn-the-Language" `TourChapterPicker` (`HomeTour.tsx:1089-1090`) | Same picker in the mobile stack (`:915-916`) |
| Fullscreen timer controls (Start / Next / Complete / Close) | Fullscreen overlay | Same overlay |
| Home quest badge | Navbar title accessory `ChallengeHeaderBadge` (`app/App.tsx:288-295`); click scrolls to the quest stage | Same navbar badge (`app/App.tsx:345`) |
| Search palette | Global (icon rail / shortcut) | Global (dock search FAB) |

Notes: `OnboardingBanner` is no longer mounted anywhere —
`ChallengeHeaderBadge` is the single home header control
(`app/App.tsx:280-287`). Runs persist a journal entry before starting
(`HomeTour.tsx:591-595`).

## 6. Guide canvas pages

`app/canvas/MarkdownCanvasPage.tsx:380-462`, routed via `app/App.tsx:241-253`
inside the `CanvasPage` shell. One shared command map for
`/guide/syntax(/…)`, `/guide/behaviors(/…)`, `/guide/analytics(/…)`,
`/ai-first`, and the collection README pages `/collections/:slug`.

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| View-panel editor (```view fence) | `CanvasEditorPanel variant="desktop"`: `hidden lg:flex` sticky side column, full height (`app/components/organisms/canvas/CanvasEditorPanel.tsx:46-66`) | `variant="mobile"`: `lg:hidden` **sticky bar under the navbar** (`top: 65px`), min 18rem tall (`CanvasEditorPanel.tsx:68-82`; `MOBILE_STICKY_TOP`, `canvasUtils.ts:5`) |
| Panel **Run** / dirty-state **Reset** | Inside the panel content (`CanvasPanelContent.tsx:41-53,77`) — same content in both variants | Same panel, repositioned into the sticky mini-panel |
| Inline prose buttons (```button fences) | Rendered inline in the scrolling prose (`CanvasSection.tsx:183-191`) | Same — never relocated |
| Page quest badge | Navbar `ChallengeHeaderBadge` when the page defines quests (`app/App.tsx:288-295`) | Same navbar badge |
| Search input | Header (PageActions bar) | Suppressed — dock search FAB |
| Cast + Page options ⋮ | Cast: header · Page options: header ⋮ dropdown | Cast: App navbar · Page options: dock ⋮ sheet (stacked rows) |
| Collection filter strip (`/collections/:slug`) | `TextFilterStrip` subheader in the sticky header (`app/App.tsx:304-307`) | Its own sticky bar below the navbar (`src/panels/page-shells/CanvasPage.tsx`) |
| Page header identity | `StickyPageHeader` title | Hidden; navbar breadcrumb (L1 › title) |

Notes: `viewDef.buttons` from ```view fences are parsed
(`app/canvas/parseCanvasMarkdown.ts:303-328`) but never displayed —
`showPanelButtons` defaults false and no caller passes it; markdown
```button fences in prose are the live mechanism. `ScrollCanvasPage` (the
fullscreen-timer canvas variant chosen by `template: scroll`) is currently
dormant — no markdown declares it; if mounted, Run comes from the
`RunwayAdapter` (desktop `ScrollRunwaySection` / mobile `RunwayMobile` /
reduced `RunwayReduced` — same command, three presentations) and the timer
replaces the page as a `FullscreenTimer` overlay
(`app/canvas/ScrollCanvasPage.tsx:105-113,164-202`).

## 7. Stream and library routes

All of these routes resolve to PageKind `library`
(`app/lib/routeView.ts:364-377`) and mount one
`QueriableStreamView` parameterized by a `StreamProfile`
(`app/views/stream/QueriableStreamView.tsx`, `streamProfile.ts:144-168`):
`/library`, `/journal`, `/collections`, `/feeds` + `/feed`, `/efforts`,
`/results`, `/results/segments`, `/results/:resultId`.

Shared command map:

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| **View** settings (sliders button) | Header, first action (`QueriableStreamView.tsx:379-389`) | Dock FAB |
| **New** (effort) — `/efforts` only | Header, next to View (`:390-400`) | Dock FAB (second) |
| WQL query bar (type chips + query) | Header queryBar slot — the full chips bar + inline composer (`:408-415`) | Thumb footer — full-width button row (compact composer, `:417-428` portal into `MobileQueryFooter`); tap opens the same WQL palette dialog (`StreamQueryBar.tsx`) |
| Cast | Header (PageActions bar, `app/App.tsx`) | App navbar |
| Page options ⋮ (Download Markdown) | Header dropdown | Dock ⋮ → stacked rows in the sheet |
| Search input | **None** — the query bar is the search entry (`showSearch={view.page !== 'library'}` → false for all stream routes) | Dock search FAB |
| Row actions: Open / Add to today / Run / Compare | Hover-revealed stack at the row end (`app/views/library/LibraryRow.tsx:183-201`); row click also opens (`:102-106`) | Row tap = Open; the hover-revealed stack does not show on touch |
| Filter typeahead + inline editor (composer) | Typing a filter key proposes **Add filter** rows; ↑↓ move the selection (clamped, never leaks to the results list), Tab accepts the highlighted one — after arrows, Enter accepts it too. Accept adds the pill (or selects an existing one) and its value list opens **inline under the composer** — ↑↓ navigate options, Enter sets/toggles values (multi filters stay in the list with check marks), Backspace pops the last value, Tab/Esc releases the pill back to free typing (`packages/ui/src/composer/filterTypeahead.ts`, `clauseItems.ts`, `InlineClauseEditor.tsx`) | Same, in the palette composer opened from the thumb footer row — the palette list renders the values under the input (no popover, focus stays in the input); on touch, tap the proposal row |
| Pill focus ring (composer) | With no typeahead/editor open, **Tab** walks a focus ring across each pill's body then its ✕ (Shift/Alt+Tab backwards); a ringed pill shows its expanded label text, a ringed ✕ turns red. Enter on a pill opens its inline editor; Enter on ✕ removes the filter — source/time are structural and **clear** instead. Tab from an open editor jumps to the **next pill's body** (or free text at the end) — never the just-edited pill's ✕. Option text typed while editing is consumed by the committed value and dropped when the editor closes, so it can't leak in as a text filter (`WqlComposer.tsx` nav ring, `TokenSlotPill` `navActive`/`removeNavActive`) | Same keys in the palette composer; on touch, tap the pill / ✕ directly |
| Feed-card actions: Open / Run / Playground | Inline pills in the card, ≥44px targets (`app/views/stream/StreamFeed.tsx:16-19,205-224`) | Same — never relocated |
| Empty-state remedy buttons | Body (`QueriableStreamView.tsx:344-358`) | Same |
| View settings dialog (layout rows/feed/cards, group-by, visible fields, reset) | Modal (`:586-597`) | Same modal |

Per-route profile differences (`streamProfile.ts:75-142`):

| Route | Default WQL | Extra |
|---|---|---|
| `/library` | `find:note last 2w` | All sources, undated shelf |
| `/journal` | `find:note{source:journal} last 4w` | — |
| `/collections` | `find:note{source:collections} by {tag}` | Undated shelf |
| `/feeds` (+ `/feed`) | `find:note{source:feeds} last 2w` | — |
| `/efforts` | `find:effort` | New button in the primary group |
| `/results` | `rows:all{} last 4w` | — |
| `/results/segments` | `rows:segment{} last 8w` | — |
| `/results/:resultId` | `rows:segment{result:<id>}` | — |

Note: `/collections/:slug` is **not** a stream — it is a canvas page (§6).

## 8. Note editor pages

### `/playground/:id` — PlaygroundNotePage

`app/pages/PlaygroundNotePage.tsx` (actions `:241-294`, verified).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Pinned-effort insert (shown when an effort is pinned) | Header, inline (primary, `:245-262,269`) | Dock FAB |
| **Move to journal** (`:270-278` → CalendarCard dialog) | Header, inline | Dock ⋮ sheet |
| **New** (fresh playground note) | Header, inline (PageActions `mode="playground"` ButtonGroup) | Dock ⋮ sheet |
| **Reset to default** (same ButtonGroup) | Header, inline | Dock ⋮ sheet |
| Search | Header, inline | Suppressed — dock search FAB |
| Cast + Page options ⋮ | Cast: header · Page options: header ⋮ dropdown | Cast: App navbar · Page options: dock ⋮ sheet (stacked rows) |
| Per-block **Play / Share / Today / Schedule** (`useScriptBlockCommands('playground')`, `:289-294`) | Inline affordances on each WOD block | Body (unchanged) |
| In-content widget buttons (attention CTA, code-example Run, `new-note`) | Body (unchanged) | Body (unchanged) |
| FirstNoteWizard (first empty note) | Modal | Same modal |

Notes: the playground note is always editable — no read/edit toggle. Schedule
opens the CalendarCard dialog (`:373-390` area).

### `/journal/:date` — JournalDatePage

`app/pages/JournalDatePage.tsx` (`:209-246`, verified). `/journal/:identity`
non-date forms resolve through `app/pages/JournalPage.tsx` (date → this page;
uuid/slug aliases → `/journal/:date?note=<uuid>`, which only scrolls/cursors —
not a command; `/journal/:date/:uuid` normalizes the same way).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| **Edit / Read mode** toggle (only when the date has ≥1 note) | Header, inline — the page's *only* header control (`<ResponsiveActions primary={editToggle} />`, `:224`) | Dock FAB |
| Cast + Page options ⋮ | **Not rendered** — this page mounts no PageActions, so the desktop header shows only the page's own actions | Cast: App navbar · Page options: dock ⋮ sheet (stacked rows) |
| Search | None in header | Dock search FAB |
| Per-block run/share; Complete-workout → `FullscreenTimer` (also on `?autoStart`) | Body / fullscreen overlay (`:247-260`) | Body / fullscreen overlay |

### `/collections/:collection/:workout` (+ `/note/:category/:name`) — WorkoutEditorPage

`app/pages/WorkoutEditorPage.tsx` (`:160-233`, verified).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| **Edit / Read mode** toggle | Header, inline (primary, `:170-183`) | Dock FAB |
| Search | Header, inline | Suppressed — dock search FAB |
| Cast + Page options ⋮ | Cast: header · Page options: header ⋮ dropdown | Cast: App navbar · Page options: dock ⋮ sheet (stacked rows) |
| Per-block **Run / Share / Add to today / Schedule / Open in playground** (`useScriptBlockCommands('collection-readonly')`, `:160-166`) | Inline affordances on each WOD block | Body (unchanged) |
| **Schedule** date picker | Centered `EditorDialog` + CalendarCard (`:218-232`) | Same modal |
| Run behavior | Popup categories → `/run/:id`; collection categories → appends to today's journal and autostarts there (`:90-117`) | Same seam |

## 9. Effort detail

### `/effort/:slug` — EffortDetailPage

Route `/effort/:slug` — `app/pages/EffortDetailPage.tsx` (`:298-335`, verified).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| **Clone** (bundled/read-only efforts, `!isEditable`) | Header, inline (primary, `:300-305`) | Dock FAB |
| **Back to catalog** (icon button) | Header, inline (`:306-308`) | Dock ⋮ sheet |
| Bundled/Custom badge | Header, inline (non-interactive) | Dock ⋮ sheet (non-interactive) |
| **Show / Hide Resolved** (when a resolved view exists) | Header, inline (`:315-323`) | Dock ⋮ sheet |
| Per-block **Run / Share / Schedule** | Inline editor affordances | Body (unchanged) |
| Schedule → CalendarCard dialog | Centered modal | Same modal |

Notes: `/effort/new?mode=create` renders a plain create form (Back / Create
Effort / Cancel as body buttons) with no ResponsiveActions — identical at both
breakpoints (`:183-247`).

## 10. Feed pages

### `/feeds/:feedSlug` — FeedDetailPage

`app/pages/FeedDetailPage.tsx` (renders `FeedFeed`, `:145-153,190-197`).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Page-level commands | None — no header actions declared | Cast: App navbar · Page options: dock ⋮ sheet; dock search FAB |
| **Add to journal** (per feed item) | Inline per-item control in the body (`:124-146`) | Body (unchanged) |
| Open item / open journal date entry / toast "Open" action | Inline in body rows / toast (`:136-153`) | Body (unchanged) |

### `/feeds/:feedSlug/:feedDate/:feedItem` — FeedItemPage

`app/pages/FeedItemPage.tsx` (`:165-196`).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Page primary | None declared — the mobile dock shows the search FAB only (no ⋮ trigger: nothing page-specific to overflow) | — |
| Search | Header, inline | Suppressed — dock search FAB |
| Cast | Header, inline | App navbar |
| Page options ⋮ | Header, inline dropdown | Dock ⋮ → stacked rows in the sheet |
| Per-block **Run / Share / Add to Today / Schedule / Open in Playground** (`useScriptBlockCommands('collection-readonly')`, `:148-155`) | Inline editor affordances | Body (unchanged) |
| Schedule → CalendarCard dialog | Centered modal (`:181-196`) | Same modal |

## 11. Dashboard pages

### `/dashboard` — AnalyticsExplorerPage (WQL explorer)

`app/views/analytics/AnalyticsExplorerPage.tsx`; the injected `PageActions`
rides the desktop-only header (`app/App.tsx:212-222`).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Search | Header input | Suppressed — dock search FAB |
| Cast | Header, inline | App navbar |
| Page options ⋮ | Header, inline dropdown | Dock ⋮ → stacked rows in the sheet |
| Explorer options (range weeks / unit) | Header, left of the actions | **Desktop-only** — lives inside the hidden header |
| Examples combo + WQL composer + **Run** | Body command bar | Body (unchanged) |
| **Save** → Query-to-dashboard dialog | Composer actions | Body (unchanged) |
| Inspect pipeline / Records toggles | Below the result frame | Body (unchanged) |

### `/dashboard/:slug` — DashboardViewPage

`app/views/dashboards/DashboardViewPage.tsx` (`:223-299`, verified).

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| **Edit / Done** toggle (editable vault dashboards) | Header, inline (primary, `:229-247`) | Dock FAB |
| Range selector | Header, inline (`:249`) | Dock ⋮ sheet |
| Unit preference | Header, inline (`:250`) | Dock ⋮ sheet |
| **Clone to vault** (prebuilt dashboards) | Banner button under the header (`:274-288`) | Body (unchanged) |
| **Add widget** (edit mode) | Dashed button above the board (`:290-298`) | Body (unchanged) |
| Per-widget edit / inspect / duplicate / remove / move / resize | Widget toolbar inside the board | Body (unchanged) |
| Sample-data prompt (no facts) | Body card | Body (unchanged) |

Notes: no PageActions/search on this page; the widget composer dialog is
viewport-independent.

## 12. Settings

### `/settings/appearance` + `/settings/system` — SettingsPage

`app/pages/SettingsPage.tsx`. Own layout — **no ResponsiveActions**; the
desktop-only `StickyPageHeader` carries the title (`:50-53`), so on mobile the
navbar breadcrumb is the identity. All controls are body content:

| Command | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Appearance / System tab switch | Body tab buttons | Body (unchanged) |
| Interface theme (System / Light / Dark) | Body card grid | Body (unchanged; single column below `sm`) |
| Date & calendar language | Body card grid | Body (unchanged) |
| **Actions Button Position** (dock corner right/left) | Body card — the setting only affects the mobile dock | Body card |
| **Startup Page** (Home / Journal — the page the app opens on; Journal also redirects the session's first `/` landing and sends the `?z=` home share to the loaded `/playground/<name>` page) | Body card grid | Body card |
| Workout sound effects + test chime | Body switch/button | Body (unchanged) |
| Debug mode toggle | Body switch | Body (unchanged) |
| Reset & clear cache (+ confirm modal) | Danger zone | Body (unchanged) |

On mobile the dock still floats over this page (search FAB + the global
Page options ⋮; cast lives in the navbar).

### `/settings/library/calcs` — CalcAuthoringPanel

Bare route (`app/App.tsx:428`) — outside the shell, no dock. Calc editor,
scope selector, diagnostics, preview, save: in-page at both breakpoints.

## 13. Runtime and utility routes

### `/run/:runtimeId` — WallClockPage (fullscreen workout)

`app/pages/WallClockPage.tsx` — bare route outside the shell; controls are
identical at both breakpoints (`FullscreenTimer` dialog).

| Command | Desktop | Mobile |
|---|---|---|
| Timer controls (autoStart, segment completion) | Fullscreen dialog | Same |
| Cast | Dialog actions row | Same |
| Audio toggle | Dialog actions row | Same |
| Finish workout → results + navigate `/results/:runtimeId` | Dialog action | Same |
| Close / abandon → back to note | Dialog close | Same |

### `/load` — LoadZipPage

Auto-ingests `?zip=`, shows Loading…, redirects. No commands
(`app/pages/LoadZipPage.tsx:22-36`).

### `/load/journal(/:date)` — JournalZipLoadPage

Own `h-screen` layout with a simple header — no shell, no dock; identical at
both breakpoints (`app/pages/JournalZipLoadPage.tsx:139-256`).

| Command | Desktop | Mobile |
|---|---|---|
| Back | Header arrow button | Same |
| Retry (error state) | Header + body buttons | Same |
| Import Today / plan-future date picker | Header import toolbar | Same |
| Backdate confirm / cancel | Modal | Same |

### `/legacy` — PlaygroundLandingPage

Static landing, no ResponsiveActions — nothing relocates
(`app/pages/PlaygroundLandingPage.tsx`): dark-mode toggle, attention CTAs
(Jump to workout / Open search), code-example Run (creates a playground note),
syntax cards — all inline at both breakpoints; "Open search" opens the global
palette everywhere.

### `/proto/calc-authoring` — CalcAuthoringPrototypePage

Throwaway prototype (`:658-714`), bare dark layout, no chrome: scope buttons,
checkboxes, calc source input, suggestion chips, variant switcher (bottom
pill bar, `?v=`) — in-page at both breakpoints.

### `*` — NotFoundPage

"Go home" button only (`app/pages/NotFoundPage.tsx:24-31`), outside the shell.

## 14. Redirect-only routes

No commands — they navigate immediately.

| Route | Destination | Source |
|---|---|---|
| `/playground` | Resumes latest or creates a playground note → `/playground/:id` ("Try again" button on failure) | `app/pages/PlaygroundRedirect.tsx` |
| `/journal/:identity` (uuid/slug aliases) | `/journal/:date?note=<uuid>` | `app/pages/JournalPage.tsx:20-62` |
| `/plan` | `/journal?mode=plan` | `app/App.tsx:436` |
| `/tracker/:runtimeId` | `/run/:runtimeId` | `app/App.tsx:456` |
| `/review/:runtimeId`, `/note/:noteId/review(/…)` | `/dashboard` (retired review screens) | `app/App.tsx:462-465` |
| `/workout/:category/:name` | `/collections/:category/:name` | `app/App.tsx:466` |
| `/note/playground/:name` | `/playground/:name` | `app/App.tsx:449` |
| `/syntax(/…)` | `/guide/syntax(/…)` | `app/App.tsx:434-435` |
| `/chapters/*`, `/challenge` | guide pages / `/` | `app/App.tsx:430-433` |
| `/analytics`, `/analytics/dashboard` | `/dashboard` | `app/App.tsx:476,478` |
| `/analytics/explorer` | `/dashboard` (query string preserved) | `app/App.tsx:99-102,477` |
| `/settings` | `/settings/appearance` | `app/App.tsx:425` |
