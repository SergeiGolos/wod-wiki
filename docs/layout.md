# Layout System — Generic Conventions

This document identifies the shared structural elements, scrolling behaviours, and responsive patterns that apply across **all three view contexts** in WOD Wiki:

| View | Entry Point | Stack |
|------|-------------|-------|
| **Web App** | `playground/src/App.tsx`, `src/panels/page-shells/` | React + Tailwind CSS |
| **Chromecast Receiver** | `playground/src/receiver-rpc.tsx` | React + Tailwind CSS |
| **TV (React Native)** | `tv/src/App.tsx` | React Native + StyleSheet |

---

## 1. Root Container Constraints

Every view fills the full viewport without double-scrollbars at the root.

| Viyew      | Root pattern                                                      |
| ---------- | ----------------------------------------------------------------- |
| Web App    | `min-h-screen w-full bg-background text-foreground`               |
| Chromecast | `h-screen w-screen bg-background text-foreground overflow-hidden` |
| TV         | `flex: 1, backgroundColor: '#121212'`                             |

**Rule**: The root container is always full-height. Scrolling is scoped to interior content zones, never the outer shell.

---

## 2. Theme Tokens

All web/cast views share the same CSS custom-property token set:

| Token | Purpose |
|-------|---------|
| `bg-background` | Page/screen background |
| `text-foreground` | Primary text |
| `bg-primary` / `text-primary-foreground` | Brand accent (active states, CTAs) |
| `text-muted-foreground` | Secondary/inactive text |
| `border-border` | Dividers and ring separations |
| `bg-muted` | Subtle fill for inactive areas |
| `bg-secondary` | Alternate panel fill |

TV uses hardcoded `#121212` background and white text — a candidate for future token alignment.

---

## 3. Responsive Breakpoints (Web App)

| Breakpoint    | Tailwind prefix     | Meaning            |
| ------------- | ------------------- | ------------------ |
| Mobile        | *(none / `max-lg`)* | < 1024 px          |
| Desktop       | `lg:`               | ≥ 1024 px          |
| Large Desktop | `3xl:`              | ≥ 1800 px (custom) |

Chromecast and TV targets are always full-screen — breakpoints do not apply.

---

## 4. Navigation / Header Layer

### 4.1 Web App — SidebarLayout

The outermost layout shell (`src/components/playground/sidebar-layout.tsx`) provides:

```
Mobile:
┌────────────────────────────────────┐
│  Sticky mobile header (z-20)       │  ← hamburger + inline navbar (~60px)
│  [hamburger] [navbar content]      │
├────────────────────────────────────┤
│  Main content (flex-1)             │
│  ┌──────────────────────────────┐  │
│  │  [page-shell sticky layers]  │  │  ← see §4.2–4.5 per shell
│  │  [scrollable content]        │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘

Desktop (lg+):
┌──────────┬─────────────────────────┐
│ Sidebar  │  Main content (flex-1)  │
│ (w-64)   │  ┌───────────────────┐  │
│ sticky   │  │ [shell sticky hdr]│  │  ← z-30, top-0
│          │  │ [nav / subheader] │  │  ← z-20, top-0 or top-[104px]
│          │  │ [scrollable body] │  │
│          │  └───────────────────┘  │
└──────────┴─────────────────────────┘
```

Key classes:
- Sidebar: `hidden lg:flex lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto`
- Mobile header: `sticky top-0 z-20 … lg:hidden`
- Main: `flex flex-1 flex-col lg:min-w-0 lg:pt-2 lg:pr-2 lg:pb-2`
- Main uses `lg:overflow-clip` (not `overflow-hidden`) to allow sticky children inside while containing the rounded content card.

### 4.2 Sticky Layer Stack (z-index ladder)

Every sticky element in the application belongs to one of these layers. **Higher z-index always wins.**

| Layer | z-index | `top` (desktop) | `top` (mobile) | Owner |
|---|---|---|---|---|
| **Modal overlays** | `z-50` | — | — | `fixed inset-0` — timer/review dialogs, Canvas `launch: dialog` |
| **Page-shell title header** | `z-30` | `top-0` | hidden (`hidden lg:…`) | `SimplePageShell`, `JournalPageShell` |
| **SidebarLayout mobile navbar** | `z-20` | hidden (`lg:hidden`) | `top-0` (~60 px tall) | `SidebarLayout` |
| **StickyNavPanel** | `z-20` | `top-0` or `top-[104px]` | not rendered | `DocsPageShell`, consumer-mounted |
| **Canvas mobile compact panel** | `z-20` | hidden (`lg:hidden`) | `sticky` | `CanvasPage` |
| **Mobile subheader** | `z-10` | not rendered | `top-[60px]` / `top-14` | `SimplePageShell` (`subheader` prop) |

> **Rule**: page-shell title headers (`z-30`) sit above nav panels (`z-20`) so that when a `StickyNavPanel` scrolls up against the title bar, the title bar wins.

### 4.3 Per-Shell Sticky Subsections

`SimplePageShell`, `DocsPageShell`, and `CanvasPage` share the same skeleton — they differ only in which nav chrome sits in the sticky top zone. See [§9 Page-Shell Catalogue](#9-page-shell-catalogue) for the full comparison.

The diagram below shows each shell's sticky stack at desktop (`lg+`).

**`SimplePageShell`** — title-bar + optional subheader:
```
┌─────────────────────────────────────────────┐
│  [accent] [Title]           [actions]  z-30 │  ← sticky top-0
│    [subheader content — optional]           │
│  ── divider ────────────────────────────── │
├─────────────────────────────────────────────┤
│  scrollable content (children)              │
└─────────────────────────────────────────────┘
```
Mobile: title header is `hidden`; subheader is `sticky top-[60px] z-10` (below the SidebarLayout navbar).

**`JournalPageShell`** — title-bar only (no subheader):
```
┌─────────────────────────────────────────────┐
│  [accent] [Title]           [actions]  z-30 │  ← sticky top-0 (lg+)
│  ── divider ────────────────────────────── │
├─────────────────────────────────────────────┤
│  editor content (main)                      │
└─────────────────────────────────────────────┘
```
Mobile: title header renders but is **not** sticky (no `sticky` class below `lg:`).

**`DocsPageShell`** — hero + StickyNavPanel (no title bar):
```
┌─────────────────────────────────────────────┐
│  HeroBanner (optional, scrolls away)        │
├─────────────────────────────────────────────┤
│  StickyNavPanel                       z-20  │  ← sticky top-0 (top-fixed variant)
│  or sticky top-[104px] (hero-follow)        │
├─────────────────────────────────────────────┤
│  Section[]  (scrollable)                    │
└─────────────────────────────────────────────┘
```
`DocsPageShell` has no title-bar; `StickyNavPanel` is the only sticky layer.

**`CalendarPageShell`** — calendar sidebar + non-sticky tab bar:
```
Desktop:                           Mobile:
┌──────────┬──────────────────┐   ┌──────────────────────────┐
│ Calendar │  [tab bar]       │   │  compact week-strip      │
│ widget   │  ── ── ── ──     │   ├──────────────────────────┤
│          │  [tab content    │   │  [tab bar]               │
│          │   overflow-auto] │   │  [tab content            │
└──────────┴──────────────────┘   │   overflow-auto]         │
                                   └──────────────────────────┘
```
The tab bar (`flex border-b bg-muted/20`) is **not** sticky — it is always visible because the detail area is a constrained flex column (`flex-1 min-h-0`). No `z-` layer is needed.

**`CanvasPage`** — two-column sticky view panel:
```
Desktop (lg+):                     Mobile:
┌──────────────────────┬────────┐  ┌──────────────────────────┐
│  prose + buttons     │  View  │  │  [compact sticky z-20]   │  ← sticky
│  (scrollable)        │  panel │  ├──────────────────────────┤
│                      │ sticky │  │  prose + buttons         │
└──────────────────────┴────────┘  │  (scrollable)            │
                                   └──────────────────────────┘
```
The view panel (`w-[60%] self-start sticky lg:flex`) has no explicit `z-` class — it is within normal flow and will not overlap other sticky layers.

### 4.4 Subheader (optional — `SimplePageShell` only)

The `subheader` prop on `SimplePageShell` injects an extra sticky bar below the title row:
- **Desktop**: rendered *inside* the sticky title header zone (same `z-30` block).
- **Mobile**: rendered as a separate `sticky top-[60px] sm:top-14 z-10` bar — offset from `top-0` by the SidebarLayout mobile navbar height (~60 px).

### 4.5 Scroll-to-Section Offset Constants

When programmatically scrolling to a section anchor, the offset must account for all sticky layers currently covering the viewport top:

| Context | Offset | Sticky layers accounted for |
|---|---|---|
| `StickyNavPanel` — `top-fixed` variant | **64 px** | StickyNavPanel only |
| `StickyNavPanel` — `hero-follow` variant | **120 px** | hero height (104 px) + StickyNavPanel |
| `SimplePageShell` / `JournalPageShell` inline scroll | **100 px** | page-shell title header + breathing room |

---

## 5. Content Column & Max-Width

Content is **not** full-bleed. It lives in a constrained column with card-like styling:

```css
flex-1 min-w-0
3xl:max-w-7xl
bg-background
shadow-xl dark:shadow-none
ring-1 ring-zinc-950/5 dark:ring-white/10
min-h-screen lg:rounded-[2.5rem]
```

At `3xl+` breakpoints a **TOC/index sidebar** (w-80) appears to the right of the content card, outside the card boundary:
- `hidden 3xl:block w-80 shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto`

---

## 6. Active Section Tracking (IntersectionObserver)

All web page shells and the `DocsPageShell` use an `IntersectionObserver` to highlight the currently visible section without relying on scroll events.

**Standard configuration:**

| Shell | rootMargin | thresholds |
|-------|------------|------------|
| `SimplePageShell` | `-10% 0px -40% 0px` | `[0, 0.3, 1.0]` |
| `JournalPageShell` | `-10% 0px -40% 0px` | `[0, 0.3, 1.0]` |
| `DocsPageShell` | `-20% 0px -50% 0px` | `[0, 0.25, 0.5, 0.75]` |
| `ParallaxSection` (mobile) | `-65px 0px -20% 0px` | `[0, 0.1, 0.25, 0.5, 0.75]` |
| `ParallaxSection` (desktop) | `-30% 0px -30% 0px` | `[0, 0.1, 0.25, 0.5, 0.75]` |
| `CanvasPage` | `-30% 0px -30% 0px` | `[0, 0.1, 0.25, 0.5, 0.75]` |

Active section state is synced to the URL query param `?s=<id>` via `nuqs` (`useQueryState`).

Scroll-to-section offsets are documented in [§4.5 Scroll-to-Section Offset Constants](#45-scroll-to-section-offset-constants).

---

## 7. Scrolling Behaviour

| Zone | Behaviour |
|------|-----------|
| Root shell | `overflow-hidden` (no outer scroll on Chromecast/TV); `overflow-visible` on web app root |
| Sidebar nav | `overflow-y-auto` (scrolls independently) |
| Main content column | Natural document scroll (`window.scrollY`) |
| TOC sidebar | `overflow-y-auto max-h-screen` |
| Calendar detail area | `overflow-auto flex-1 min-h-0` |
| `ScrollSection` primitive | `overflow-y-auto` when `maxHeight` is set, natural otherwise |

**Parallax / `ParallaxSection`**: the sticky child panel uses `position: sticky` — parent overflow must **not** be `hidden` or `auto`. The `SidebarLayout` main wrapper applies `lg:overflow-clip` to contain the sticky rounding, which is intentionally **not** scoped below lg to allow mobile sticky subheaders to work.

---

## 8. Overlay / Dialog Layer

Modal overlays (timer, review dialogs) are rendered at `z-50` with `fixed inset-0`:

```
bg-background/95 backdrop-blur-sm
  └── flex flex-col
        ├── [close button row — top-right]
        └── [flex-1 min-h-0 content]
```

Chromecast uses the same `fixed inset-0` pattern for its mode transitions (preview → active → review), but without a close button — the sender controls dismissal.

---

## 9. Page-Shell Catalogue

### 9.1 The Shared Pattern

`SimplePageShell`, `DocsPageShell`, and `CanvasPage` are all implementations of the **same structural skeleton**:

```
┌─────────────────────────────────────────────┐
│  [sticky top zone — nav chrome]             │
├─────────────────────────────────────────────┤
│  scrollable sections                        │
│    each observed by IntersectionObserver    │
└─────────────────────────────────────────────┘
```

The difference between them is **content API, nav chrome, and runtime integration** — not layout structure.

| Axis | `SimplePageShell` | `DocsPageShell` | `CanvasPage` |
|---|---|---|---|
| **Content API** | `children: ReactNode` (arbitrary) | `sections: DocsSection[]` (typed array) | `page: ParsedCanvasPage` (markdown DSL) |
| **Nav chrome** | Title bar + accent bar (z-30) | `StickyNavPanel` pill buttons (z-20) | Sticky split-panel or none |
| **Runtime integration** | None | `ScopedRuntimeProvider` per section (opt-in via `runtimeFactory`) | Shared `executePipeline` + active view runtime |
| **Interactive content** | Passive display | Isolated per-section runtime demos | Pipeline execution: `set-source`, `set-state`, `launch` |
| **URL sync** | `?s=<id>` via `nuqs` | Local state only | `?h=<heading>` via `nuqs` |
| **TOC sidebar** | Yes (3xl+) | No | No |

> `SimplePageShell` and `DocsPageShell` differ only in nav chrome — `DocsPageShell` is `SimplePageShell` with a `StickyNavPanel` instead of a title bar, and typed `sections[]` instead of arbitrary children. They are candidates for consolidation.

> `CanvasPage` is the only shell that owns active runtime state. It is a display shell **and** an interactive execution layer.

### 9.2 The Outliers

`JournalPageShell` and `CalendarPageShell` do **not** follow the sections pattern:

| Shell | File | Use Case | Why it's different |
|---|---|---|---|
| `JournalPageShell` | `src/panels/page-shells/JournalPageShell.tsx` | Note/Journal editor with timer + review overlays | Full-viewport editor — no scrollable sections, no IntersectionObserver |
| `CalendarPageShell` | `src/panels/page-shells/CalendarPageShell.tsx` | Calendar/date selection with tabbed detail area | Two-column layout (calendar sidebar + tabbed detail); tab bar is not sticky |

---

## 10. Primitive Components

| Component | File | Role |
|-----------|------|------|
| `HeroBanner` | `page-shells/HeroBanner.tsx` | Full-width hero with title, subtitle, CTA |
| `StickyNavPanel` | `page-shells/StickyNavPanel.tsx` | Horizontal sticky section nav (pill buttons) |
| `ScrollSection` | `page-shells/ScrollSection.tsx` | Optional max-height scoped scroll zone |
| `ParallaxSection` | `page-shells/ParallaxSection.tsx` | Scroll-driven step progression with sticky overlay |
| `PanelShell` | `panel-system/PanelShell.tsx` | Individual panel wrapper (span + expand/collapse) |
| `SidebarLayout` | `components/playground/sidebar-layout.tsx` | Root app shell (sidebar + mobile nav) |

---

## 11. Accessibility Notes

- `prefers-reduced-motion`: `ParallaxSection` disables its IntersectionObserver and renders steps as a flat list when the media query is active.
- Sticky elements use `backdrop-blur-md` for legibility over scrolled content.
- Modals use `bg-background/95` (not fully opaque) so spatial context is preserved.
