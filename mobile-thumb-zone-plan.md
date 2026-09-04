# Mobile Thumb-Zone Redesign — Bottom Search Bubble + Keyboard-Safe WQL Composer

## Goal
On phones (≤1023px, existing `useIsMobile` / `lg:` convention), move search and query composition into the thumb zone: a bottom-anchored bubble that expands into the WQL composer as a keyboard-aware bottom sheet, on every playground view. Desktop is untouched.

## Design Decisions

**Shell bubble (`SearchBubble`)** — new fixed FAB, bottom-right, `lg:hidden`, ≥48px target, `padding-bottom: env(safe-area-inset-bottom)`. Mounted once in `SidebarLayout` (mobile branch, `src/templates/SidebarLayout.tsx:85-94`). Tap → existing `openSearchPalette` seam (`apps/playground/app/App.tsx:138`) → palette WQL mode. No new search backend.

**Keyboard-safe sheet** — greenfield: repo has zero `visualViewport`/keyboard-avoidance code. New hook `useKeyboardInset()` listens to `window.visualViewport` resize/scroll; the palette/composer presenter renders as a bottom sheet pinned to `bottom = innerHeight - visualViewport.height - visualViewport.offsetTop`, max-height = visible viewport, internal scroll. Composer keeps focus (`WqlComposer` `autoFocus` prop, `packages/ui/src/composer/WqlComposer.tsx:172-177`) without the keyboard covering pills, input, or results.

**Per-view mapping** (all citations verified by codebase scout):

| View | Today (mobile) | Redesign |
|---|---|---|
| Library/stream (`/library`) | Compact `StreamQueryBar` portaled into top navbar via `MobileQuerySlot` (`QueriableStreamView.tsx:313-323`) | Retire the navbar portal; active query summary lives in/above the bubble; expanded sheet hosts the composer bound to existing `useComposerQueryState` (URL `?q=` round-trip unchanged) |
| Analytics explorer (`/dashboard`) | In-place `WqlComposer` in `ExplorerCommandBar` under `StickyPageHeader` | Desktop row stays; mobile collapses to a summary row that opens the same bottom sheet bound to `useExplorerQueryState` draft (run-on-submit split preserved) |
| Canvas/journal/settings pages | Navbar search icon only | Global bubble → palette WQL mode; no per-page work |
| Command palette (`PaletteShell`) | Top-of-screen overlay, plain or WQL mode | Mobile presentation swaps to the bottom sheet; WQL mode still embeds `WqlComposer`, live-search loop untouched (`PaletteShell.tsx:60-90`) |

**Pattern precedent** — page→chrome binding copies the proven `MobileQuerySlot` provider/target/portal shape (`src/panels/page-shells/MobileQuerySlot.tsx:25-56`), renamed for the bottom slot.

## Tasks
- [ ] 1. Generate Stitch mockups (prompts in appendix) → Verify: screens for bubble-collapsed, sheet-open-above-keyboard, and results states approved for Library + Explorer + generic page
- [ ] 2. `useKeyboardInset()` hook (`app/hooks/`) wrapping `visualViewport` resize/scroll → Verify: unit test or manual: inset tracks iOS Safari/Android Chrome keyboard open/close
- [ ] 3. `SearchBubble` FAB in `SidebarLayout` mobile branch, opens `openSearchPalette` → Verify: 360×640 emulation: bubble bottom-right, clears safe area, ≥48px
- [ ] 4. Mobile bottom-sheet presenter for `PaletteShell` (keyboard-anchored, scroll-contained) → Verify: with keyboard open, composer input and first results fully visible, no viewport jump
- [ ] 5. Library: move compact query summary out of navbar portal into the bubble zone; sheet binds page composer state → Verify: `/library` on phone: `?q=` round-trip, back/forward restore, palette search all work
- [ ] 6. Explorer: mobile summary row → sheet bound to `useExplorerQueryState` draft → Verify: `/dashboard` on phone: compose → Run → results, examples combo intact
- [ ] 7. Remove retired mobile-navbar query slot wiring (`MobileQuerySlotTarget` usage in `App.tsx:334-352`) once bubble covers stream routes → Verify: no double search affordance in navbar; desktop header unchanged
- [ ] 8. Final pass: every route at 360×640 with keyboard toggled; run `npm run test` and `npm run build` → Verify: no view obscured by keyboard, all touch targets ≥44px, suite green

## Done When
- [ ] Search/WQL composer reachable and fully operable one-handed in the thumb zone on every playground view
- [ ] Keyboard never covers the composer input, pills, or active result
- [ ] Desktop (≥1024px) pixel-identical to today

## Appendix — Stitch Prompts (per-view, paste into a new Stitch project)

> Stitch MCP is not mounted in this environment (only Repowise is configured in `.vscode/mcp.json`), so these prompts are the handoff. Each prompt targets mobile frame 390×844, dark+light, existing zinc/Tailwind palette.

1. **Collapsed bubble (all pages):** "Mobile fitness-journal app screen, dark theme. Content list fills the viewport. Bottom-right floating circular search button (56px) with magnifier icon, elevated shadow, sitting above a safe-area gap. Top bar minimal: menu, breadcrumb. Thumb-zone heat: primary action bottom."
2. **Expanded composer sheet (Library):** "Same app. A bottom sheet rises to just above the on-screen keyboard. Sheet contains a query composer bar: token pills labeled 'notes', 'last 2w', a text input with cursor, '+ Add filter' chip, and a results list scrolling between sheet header and keyboard. Keyboard visible below; nothing hidden behind it."
3. **Explorer variant:** "Same sheet pattern on an analytics page: composer row with examples dropdown and a 'Run' button in the bar's trailing slot; chart placeholder visible in the dimmed background above the sheet."
4. **Empty/idle state:** "Sheet open, composer empty with placeholder 'find:note last 2w', suggestion chips in two rows, keyboard open."
