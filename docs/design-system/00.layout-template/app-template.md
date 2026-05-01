**Component:** `AppTemplate` (Template)  
**Atomic Level:** Template — layout skeleton with slot-based composition  
**Status:** Design Draft  
**Last Updated:** 2025-04-30  
  
---  
  
**Overview**  
  
`AppTemplate` is the top-level layout shell for every page in the wod-wiki playground. It owns the three-panel slot architecture, breakpoint behavior, and panel visibility logic. All page-level content is injected into one of three named slots.  
  
The component is a refinement of the existing `SidebarLayout` — extending it from a two-state (mobile drawer / desktop persistent) model into a **three-panel, three-breakpoint** system.  
  
---  
  
**Panel Model**  
  
Three named panels. Each has a default visibility state per breakpoint.  
  
| Panel | Slot Prop | Default Content |  
|---|---|---|  
| **Left Nav** | `leftNav` | Primary navigation — L1 routes, logo, footer actions |  
| **Center Content** | `children` | Main content area — always visible |  
| **Right Secondary** | `rightPanel` | Contextual content — filters, detail view, annotations |  
  
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
║  │  LEFT NAV  │  │    CENTER CONTENT          │  │   RIGHT        │  ║
║  │            │  │                            │  │   SECONDARY    │  ║
║  │  lg:w-64   │  │   flex-1  min-w-0          │  │                │  ║
║  │  sticky    │  │                            │  │   lg:w-72      │  ║
║  │  top-0     │  │   [page content]           │  │   sticky       │  ║
║  │  self-start│  │                            │  │   top-0        │  ║
║  │  max-h-svh │  │                            │  │                │  ║
║  │  backdrop- │  │                            │  │                │  ║
║  │  blur      │  │                            │  │                │  ║
║  └────────────┘  └────────────────────────────┘  └────────────────┘  ║
║  flex-row  max-w-[100rem]  centered  no top header                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

  LEFT NAV     → persistent, sticky, scrollable
  CENTER       → flex-1, takes remaining space
  RIGHT        → persistent, sticky, scrollable
  HEADER       → hidden (lg:hidden) 
  
**Mid (sm → lg) — Left Nav + Center, Right Behind ⋮ Hotdog**  
```
╔══════════════════════════════════════════════╗
║  ┌──────────┐  ┌───────────────────────┐[⋮]   ║  ← sticky top-0
║  │ LEFT NAV │  │   CENTER CONTENT      │     ║     bg-white/zinc-900
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
  
  LEFT NAV     → persistent sidebar (same as desktop)
  CENTER       → flex-1, narrows to accommodate nav
  RIGHT        → hidden → slide-out drawer on ⋮ tap
  HEADER       → visible, holds ⋮ hotdog button right-aligned

  
  
    
**Mobile (< sm) — Center Only, Both Panels Behind Buttons**  
  
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

*Sticky Header (Molecule)*

Visible over the content section on mobile mid and desktop.

The header is a composition slot — it can contain any combination of:
- Title
- Inline search bar
- Navigation links (truncated label set)
- Hamburger trigger (☰) — left-aligned, shows on mobile only
- Hotdog trigger (⋮) — right-aligned, always contains settings and can include secondary bar content.

Mobile:  
```
┌──────────────────────────────────────────────────────────────┐  
│  ☰   [logo / wordmark]                                  [⋮] │  
└──────────────────────────────────────────────────────────────┘  

```  
Mid:  
```
┌──────────────────────────────────────────────────────────────┐  
│  [logo]  [nav link]  [nav link]  [search............]   [⋮]   │  
└──────────────────────────────────────────────────────────────┘
```

Appears *raised above content* — `shadow-sm` or `drop-shadow` + `z-20`.
Background: `bg-white dark:bg-zinc-900` with optional `backdrop-blur`.

---

*Component Props*

```typescript
interface AppTemplateProps {
  /** L1 navigation tree — logo, nav items, footer */
  leftNav: React.ReactNode

  /** Contextual right panel — filters, detail, annotations */
  rightPanel: React.ReactNode

  /** Inline navbar content for the sticky header (mid + mobile) */
  navbar?: React.ReactNode

  /** Page content */
  children: React.ReactNode
}
```
   ---  
  
**Layout Tokens**  
  
| Token | Value | Usage |  
|---|---|---|  
| `left-nav-width` | `w-64` (256px) | Persistent left nav width |  
| `right-panel-width` | `w-72` (288px) | Persistent right panel width |  
| `drawer-max-width` | `max-w-80` (320px) | Slide-out drawer (both sides) |  
| `max-content-width` | `max-w-[100rem]` | Overall container cap |  
| `header-z` | `z-20` | Sticky header stacking |  
| `drawer-z` | `z-30` | Drawer above header |  
| `backdrop` | `bg-black/30` | Drawer backdrop overlay |  
| `nav-bg` | `bg-zinc-50/72 backdrop-blur-sm` | Persistent nav background |  
| `header-bg` | `bg-white dark:bg-zinc-900` | Sticky header background |  
  
---  
  
**Transitions**  
  
| Interaction | Animation |  
|---|---|  
| Left drawer open | `translate-x` from `-full` → `0`, duration 300ms ease-out |  
| Left drawer close | `translate-x` from `0` → `-full`, duration 200ms ease-in |  
| Right drawer open | `translate-x` from `+full` → `0`, duration 300ms ease-out |  
| Right drawer close | `translate-x` from `0` → `+full`, duration 200ms ease-in |  
| Backdrop | `opacity` 0 → 1, same duration as panel |  
| Route change | Both drawers auto-close (`useEffect` on `useLocation`) |  
  
---  
  
**Relationship to** `**SidebarLayout**`  
  
`AppTemplate` extends `SidebarLayout` with:

1. **Right panel slot** — new `rightPanel` prop + `MobileRightDrawer` component  
2. **Hotdog button** (⋮) — added to header, right-aligned  
3. **Mid breakpoint behavior** — left nav persists at `sm`, not just `lg`  
4. **Three-state visibility matrix** replacing the two-state mobile/desktop model  
  
The existing `MobileSidebar` (Headless UI Dialog, left slide-in) is reused as-is. A symmetric `MobileRightDrawer` is added with identical structure, slide direction reversed.  
  
---  
  
**Do's and Don'ts**  
  
**Do**  
- Keep `children` (center content) as the only always-visible panel  
- Use `rightPanel` for content that is contextual to the current page, not global  
- Let `leftNav` own all L1 routing — don't duplicate nav items in the header  
- Close both drawers on route change  
  
**Don't**  
- Don't put critical actions in the right panel — it's hidden on mobile/mid unless tapped  
- Don't hardcode panel widths inline — reference the layout tokens above  
- Don't add a third drawer trigger to the header — two is the limit for touch ergonomics  
- Don't show the sticky header on desktop — the persistent sidebar handles identity/nav