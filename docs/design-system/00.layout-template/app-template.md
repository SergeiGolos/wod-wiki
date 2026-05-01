**Component:** `AppTemplate` (Template)  
**Atomic Level:** Template — layout skeleton with slot-based composition  
**Status:** Design Draft  
**Last Updated:** 2026-04-30  
  
---  
  
**Overview**  
  
`AppTemplate` is the top-level layout shell for every page in the wod-wiki playground. It owns the three-panel slot architecture, breakpoint behavior, and panel visibility logic. All page-level content is injected into one of three named slots.  
  
The component is a refinement of the existing `SidebarLayout` — extending it from a two-state (mobile drawer / desktop persistent) model into a **three-panel, three-breakpoint** system.  
  
---  
  
**Panel Model**  
  
Three named panels. Each has a default visibility state per breakpoint.  
  
| Panel               | Slot Prop      | Default Content                                        |     |
| ------------------- | -------------- | ------------------------------------------------------ | --- |
| **Left Panel**      | `leftPanel`    | Primary navigation — L1 routes, logo, footer actions   |     |
| **Content Panel**   | `contentPanel` | Main content area — always visible                     |     |
| **Right Panel**     | `rightPanel`   | Contextual content — filters, detail view, annotations |     |
  
---  
  
**Breakpoint Behavior**  
  
Three breakpoints, two transition points.  
  
```
← mobile ──────────────── tablet/mid ──────────────── lg+ desktop →
  < sm                      sm → lg                     lg+
```  
  
**Desktop Large (**`**lg+**` **/ ≥ 1024px) — All Three Panels**  
  
```
╔══════════════════════════════════════════════════════════════════════╗
║  ┌────────────┐  ┌────────────────────────────┐  ┌────────────────┐  ║
║  │ LEFT PANEL │  │  CONTENT PANEL             │  │   RIGHT PANEL  │  ║
║  │            │  │                            │  │                │  ║
║  │  lg:w-64   │  │   flex-1  min-w-0          │  │   lg:w-72      │  ║
║  │  sticky    │  │                            │  │   sticky       │  ║
║  │  top-0     │  │   [page content]           │  │   top-0        │  ║
║  │  self-start│  │                            │  │                │  ║
║  │  max-h-svh │  │                            │  │                │  ║
║  │  backdrop- │  │                            │  │                │  ║
║  │  blur      │  │                            │  │                │  ║
║  └────────────┘  └────────────────────────────┘  └────────────────┘  ║
║  flex-row  max-w-[100rem]  centered  no top header                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

  LEFT PANEL   → persistent, sticky, scrollable
  CONTENT      → flex-1, takes remaining space
  RIGHT PANEL  → persistent, sticky, scrollable
  HEADER       → hidden (lg:hidden) 
  
**Mid (sm → lg) — Left Panel + Content Panel, Right Behind ⋮ Menu**  
```
╔══════════════════════════════════════════════╗
║  ┌──────────┐  ┌───────────────────────┐[⋮]   ║  ← content header
║  │LEFT PANEL│  │   CONTENT PANEL       │     ║     bg-white/zinc-900
║  │          │  │                       │     ║
║  │ w-64     │  │   flex-1              │     ║
║  │ sticky   │  │                       │     ║
║  │ top-0    │  │   [page content]      │     ║
║  │          │  │                       │     ║
║  └──────────┘  └───────────────────────┘     ║
╚══════════════════════════════════════════════╝
```

  [⋮] tap → Right panel slides in from right edge (max-w-80):

```
  ╔══════════════════╗▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
  ║             [✕]  ║  bg-black/30 backdrop  ▒
  ║  {rightPanel}    ║                        ▒
  ║                  ║                        ▒
  ╚══════════════════╝▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒

```
  
  LEFT PANEL   → persistent sidebar (same as desktop)
  CONTENT      → flex-1, narrows to accommodate nav
  RIGHT PANEL  → hidden → slide-out drawer on ⋮ tap
  HEADER       → visible, holds ⋮ menu button right-aligned

**Mobile (< sm) — Content Panel Only, Both Panels Behind Buttons**  
  
```  
╔──────────────────────────────────────────────╗  ← sticky top-0 z-20  
│ ☰                                       [⋮] │     bg-white/zinc-900  
╚──────────────────────────────────────────────╝  
╔──────────────────────────────────────────────╗  
║                                              ║
║          CENTER CONTENT                      ║  
║          full width                          ║  
║          flex-1                              ║  
║          [page content]                      ║  
║                                              ║  
╚──────────────────────────────────────────────╝  
  
  ☰ tap → Left nav slides in from left    (max-w-80, existing MobileSidebar)  
  ⋮ tap → Right panel slides in from right (max-w-80, new MobileRightDrawer)   
```

  LEFT NAV     → hidden → slide-out drawer on ☰ tap  
  CENTER       → full width, only visible panel  
  RIGHT        → hidden → slide-out drawer on ⋮ tap  
  HEADER       → always visible, holds both trigger buttons

---

*Panel Visibility Matrix*

 Panel              Mobile (<sm)     Mid (sm–lg)      Desktop (lg+)  
 ──────────────────────────────────────────────────────────────────  
 Left Nav           ✗ drawer (☰)    ✓ persistent     ✓ persistent  
 Center Content     ✓ full width    ✓ flex-1         ✓ flex-1  
 Right Secondary    ✗ drawer (⋮)    ✗ drawer (⋮)     ✓ persistent  
 ──────────────────────────────────────────────────────────────────  
 Sticky header      ✓ visible       ✓ visible        ✗ hidden  
 Hamburger ☰        ✓ visible       ✗ hidden         ✗ hidden  
 Hotdog ⋮           ✓ visible       ✓ visible        ✗ hidden  
 ──────────────────────────────────────────────────────────────────  
 Hard breakpoints   < sm            sm → lg          lg+

---

*Content Header (Molecule)*

Visible over the content section on mobile, mid, and hidden on desktop.

The header is a composition slot — it can contain any combination of:
- Title
- Inline search bar
- Navigation links (truncated label set)
- Hamburger trigger (☰) — left-aligned, shows on mobile only
- Menu trigger (⋮) — right-aligned, always contains settings and can include secondary content.

Mobile:  
```
┌──────────────────────────────────────────────────────────────┐  
│  ☰   [logo / wordmark]                                  [⋮] │  
└──────────────────────────────────────────────────────────────┘  

```  
Mid & Desktop:  
```
┌──────────────────────────────────────────────────────────────┐  
│  [logo]  [nav link]  [nav link]  [search............]   [⋮]   │  
└──────────────────────────────────────────────────────────────┘
```

Appears *raised above content* — `shadow-sm` or `drop-shadow` + `z-20`.
Background: `bg-white dark:bg-zinc-900` with optional `backdrop-blur`.

---

*Component Props*

These are the **static** slot props passed directly to `AppTemplate`. Dynamic, per-page content (title, quick actions, right panel body, etc.) is injected via `AppLayoutContext` — see the Context API section below.

```typescript
interface AppTemplateProps {
  /** L1 navigation tree — logo, nav items, footer (global, never changes per route) */
  leftPanel: React.ReactNode

  /** Fallback right panel shell (drawer chrome, resize handle) — body injected via context */
  rightPanel?: React.ReactNode

  /** Inline header content for the content header (mid + mobile) — static brand / search */
  contentHeader?: React.ReactNode

  /** Page content — rendered in the content panel area */
  contentPanel: React.ReactNode
}
```
   ---  
  
**Layout Tokens**  
  
| Token | Value | Usage |  
|---|---|---|  
| `left-panel-width` | `w-64` (256px) | Persistent left panel width |  
| `right-panel-width` | `w-72` (288px) | Persistent right panel width |  
| `drawer-max-width` | `max-w-80` (320px) | Slide-out drawer (both sides) |  
| `max-content-width` | `max-w-[100rem]` | Overall container cap |  
| `header-z` | `z-20` | Content header stacking |  
| `drawer-z` | `z-30` | Drawer above header |  
| `backdrop` | `bg-black/30` | Drawer backdrop overlay |  
| `panel-bg` | `bg-zinc-50/72 backdrop-blur-sm` | Persistent panel background |  
| `header-bg` | `bg-white dark:bg-zinc-900` | Content header background |  
  
---  
  
**Transitions**  
  
| Interaction | Animation |  
|---|---|  
| Left panel drawer open | `translate-x` from `-full` → `0`, duration 300ms ease-out |  
| Left panel drawer close | `translate-x` from `0` → `-full`, duration 200ms ease-in |  
| Right panel drawer open | `translate-x` from `+full` → `0`, duration 300ms ease-out |  
| Right panel drawer close | `translate-x` from `0` → `+full`, duration 200ms ease-in |  
| Backdrop | `opacity` 0 → 1, same duration as panel |  
| Route change | Both drawers auto-close (`useEffect` on `useLocation`) |  
  
---  
  
**Relationship to** `**SidebarLayout**`  
  
`AppTemplate` extends `SidebarLayout` with:

1. **Right panel slot** — new `rightPanel` prop + `MobileRightDrawer` component  
2. **Menu button** (⋮) — added to content header, right-aligned  
3. **Mid breakpoint behavior** — left panel persists at `sm`, not just `lg`  
4. **Three-state visibility matrix** replacing the two-state mobile/desktop model  
  
The existing `MobileSidebar` (Headless UI Dialog, left slide-in) is reused as-is. A symmetric `MobileRightDrawer` is added with identical structure, slide direction reversed.  
  
---  
  
**Context API — Dynamic Slot Injection**

`AppTemplate` owns the rendered positions for all panels and header zones. Pages that inherit this template must be able to inject content into those positions from anywhere in the component tree without prop-drilling through the router.

*Pattern: Context + `useEffect` injection* (same as `NavContext.setL3Items` already in this codebase, and the same model as `react-helmet` for `<head>` management).

The layout holds state for every injectable slot. Pages call a single hook with a declarative slot map; the hook's `useEffect` registers content on mount and clears it on unmount, so slots never leak between routes.

---

*Slot Inventory*

| Slot key             | Rendered location                      | Type              | Notes                          |
| -------------------- | -------------------------------------- | ----------------- | ------------------------------ |
| `title`              | Content header center / page `<title>` | `React.ReactNode` | Plain string or custom element |
| `headerQuickActions` | Header — left of ⋮ button              | `React.ReactNode` | Icon buttons only; max ~3      |
| `settingsItems`      | ⋮ dropdown menu body                   | `React.ReactNode` | `<SettingsItem>` elements      |
| `leftPanelContent`   | Left panel (below L1 items)            | `React.ReactNode` | L2/L3 contextual content       |
| `rightPanelContent`  | Right panel                            | `React.ReactNode` | Filters, detail, annotations   |

---

*Context Shape*

```typescript
// src/components/layout/AppLayoutContext.tsx

export interface AppLayoutSlots {
  title?: React.ReactNode
  headerQuickActions?: React.ReactNode
  settingsItems?: React.ReactNode
  leftPanelContent?: React.ReactNode
  rightPanelContent?: React.ReactNode
}

export interface AppLayoutContextValue {
  slots: AppLayoutSlots
  setSlots: (slots: Partial<AppLayoutSlots>) => void
  clearSlots: () => void
}

export const AppLayoutContext = createContext<AppLayoutContextValue>({
  slots: {},
  setSlots: () => {},
  clearSlots: () => {},
})

export function useAppLayout() {
  return useContext(AppLayoutContext)
}
```

---

*Provider (lives inside `AppTemplate`)*

```typescript
// AppTemplate holds the slot state and provides it to children
export function AppTemplate({ leftPanel, contentHeader, rightPanel, contentPanel }: AppTemplateProps) {
  const [slots, setSlotsState] = useState<AppLayoutSlots>({})

  const setSlots = useCallback((next: Partial<AppLayoutSlots>) => {
    setSlotsState(prev => ({ ...prev, ...next }))
  }, [])

  const clearSlots = useCallback(() => setSlotsState({}), [])

  return (
    <AppLayoutContext.Provider value={{ slots, setSlots, clearSlots }}>
      {/* layout renders slots.title, slots.rightPanelContent, etc. */}
      ...
    </AppLayoutContext.Provider>
  )
}
```

---

*Consumer hook — `usePageLayout`*

Pages call this once at the top of their component. The hook registers content on mount and resets those keys on unmount so route changes are clean.

```typescript
// src/hooks/usePageLayout.ts

export function usePageLayout(slots: Partial<AppLayoutSlots>) {
  const { setSlots, clearSlots } = useAppLayout()

  useEffect(() => {
    setSlots(slots)
    // On unmount: clear only the keys this page set
    return () => {
      const resetKeys = Object.fromEntries(
        Object.keys(slots).map(k => [k, undefined])
      ) as Partial<AppLayoutSlots>
      setSlots(resetKeys)
    }
    // Re-run only when slot content changes (stable references preferred)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(slots))
}
```

*Page usage:*

```typescript
export function WorkoutsPage() {
  usePageLayout({
    title: 'Workouts',
    headerQuickActions: <NewWorkoutButton />,
    settingsItems: <WorkoutSortSettings />,
    rightPanelContent: <WorkoutFilters />,
  })

  return <WorkoutList />
}
```

---

*Why this pattern*

| Alternative | Why not |
|---|---|
| Prop drilling through `<Routes>` | Router renders pages as children of `<Outlet>` — the shell can't receive props from inside the tree |
| Render props on `AppTemplate` | Requires lifting all page-level state to the router level; tight coupling |
| React portals (`createPortal`) | Requires stable DOM mount nodes; harder to type and test; no cleanup convention |
| `useContext` with compound components (`<AppTemplate.Title>`) | Clean syntax but requires components to be direct children; breaks with nested routes |
| **Context + `useEffect` injection** ✓ | Works at any depth, cleans up on unmount, matches existing `NavContext.setL3Items` pattern, easily testable |

---

*Relationship to `NavContext`*

`NavContext` already uses this pattern for `setL3Items` (pages inject scroll anchors) and `registerScrollFn` (pages override scroll behavior). `AppLayoutContext` is a parallel context scoped to visual layout slots rather than navigation state. Keep them separate — they have different lifecycles and consumers.

---

**Do**  
- Keep `contentPanel` as the only always-visible panel  
- Use `rightPanel` for content that is contextual to the current page, not global  
- Let `leftPanel` own all L1 routing — don't duplicate nav items in the content header  
- Close both drawers on route change  
  
**Don't**  
- Don't put critical actions in the right panel — it's hidden on mobile/mid unless tapped  
- Don't hardcode panel widths inline — reference the layout tokens above  
- Don't add a third drawer trigger to the content header — two is the limit for touch ergonomics  
- Don't show the content header on desktop — the persistent left panel handles identity/nav