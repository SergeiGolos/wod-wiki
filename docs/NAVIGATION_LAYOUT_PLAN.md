# Navigation Layout Plan

## Overview
The **page navigation / "jump to sections" menu** currently has **2 places it lives**:
1. **PageNavDropdown** (dropdown in top navbar) — visible from mobile through 3xl
2. **TOC Sidebar** (right-side panel) — only visible at 3xl+ breakpoint

This creates inconsistency. The table below maps current placement and opens the floor for future redesign.

---

## Navigation Elements Across Screen Sizes

### Legend
- **Mobile**: < 768px (< `lg:` breakpoint)
- **Tablet/Small Desktop**: 768px - 1799px (between `lg:` and `3xl:`)
- **Large Desktop**: 1800px+ (`3xl:` breakpoint)

---

### Navigation Layout Table

| **Screen Size** | **Current State** | **Future State** |
|---|---|---|
| **MOBILE** (`< lg`) |  |  |
| Sidebar | Hidden behind hamburger modal | [TO BE DECIDED] |
| Navbar | Sticky header with: hamburger, workout name, PageNavDropdown, icons | [TO BE DECIDED] |
| Page Menu (TOC) | **PageNavDropdown** (dropdown button in navbar) | [TO BE DECIDED] |
| Layout | Stacked vertically | [TO BE DECIDED] |
| Visual | Header compresses with flexbox gap-2, content scrolls below | [TO BE DECIDED] |
|  |  |  |
| **TABLET / SMALL DESKTOP** (`lg:` to `3xl:`) |  |  |
| Sidebar | Fixed left panel (w-64), always visible | [TO BE DECIDED] |
| Navbar | Top-right area (after NavbarSpacer) | [TO BE DECIDED] |
| Page Menu (TOC) | **PageNavDropdown** (dropdown button in navbar) | [TO BE DECIDED] |
| Layout | Side-by-side: Sidebar left, main content right | [TO BE DECIDED] |
| Visual | PageNavDropdown shows current section, clickable to jump | [TO BE DECIDED] |
|  |  |  |
| **LARGE DESKTOP** (`3xl:+) |  |  |
| Sidebar | Fixed left panel (w-64), always visible | [TO BE DECIDED] |
| Navbar | Top-right area | [TO BE DECIDED] |
| Page Menu (TOC) | **BOTH**: PageNavDropdown hidden + TOC Sidebar (right, w-80, sticky) | [TO BE DECIDED] |
| Layout | Three-column: Sidebar left, main content center, TOC sidebar right | [TO BE DECIDED] |
| Visual | TOC sidebar sticky at top, shows active section with bold + border | [TO BE DECIDED] |

---

## Current Implementation Details

### PageNavDropdown
- **File**: `src/components/playground/PageNavDropdown.tsx`
- **Displayed as**: Dropdown button with icon + section label + chevron
- **Visibility**: All breakpoints except 3xl (hidden at `className="3xl:hidden"`)
- **Content**: List of page sections/headings with Play buttons for workouts
- **Behavior**: IntersectionObserver tracks scroll position, updates active section

### TOC Sidebar (JournalPageShell/SimplePageShell)
- **File**: `src/panels/page-shells/JournalPageShell.tsx`, `SimplePageShell.tsx`
- **Displayed as**: Right-side sticky panel, linked list of headings
- **Visibility**: Only at 3xl+ (`hidden 3xl:block w-80`)
- **Content**: Same as PageNavDropdown, "On this page" label
- **Behavior**: Sticky positioning, active indicator (bold + left border)

### Key Conflict
The **same content** (page sections) is presented in **two different ways** depending on screen size:
- **Small to medium**: Compact dropdown in navbar space constraints
- **Large**: Dedicated sidebar panel with full list visible

---

## Questions for Future State

What should happen in each view?

1. **Should both TOC representations exist?** Or consolidate to one?
2. **Mobile**: Should PageNavDropdown stay in navbar, or move elsewhere?
3. **Tablet**: Does PageNavDropdown need more prominence? Could sidebar have a better place?
4. **Desktop**: Should TOC sidebar always show if space permits? Should PageNavDropdown be removed?
5. **Overall strategy**: One source of truth for page nav, or two optimized for screen size?

---

## File References
- Master layout: `src/components/playground/sidebar-layout.tsx` (lines 48-92)
- Sidebar component: `src/components/playground/sidebar.tsx`
- Navbar component: `src/components/playground/navbar.tsx`
- App integration: `playground/src/App.tsx` (lines 1130-1210)
- PageNavDropdown: `src/components/playground/PageNavDropdown.tsx`
- Page shells: `src/panels/page-shells/JournalPageShell.tsx`, `SimplePageShell.tsx`
