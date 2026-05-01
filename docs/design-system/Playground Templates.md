- Sticky Header  (Molecule)
	- Can contain additional components (search bars, links , text)
- Center column content
	- Main content pain
	- Appears raised above the background with slight sadow
- `Navigation panel` 
- `Secondary panel`
### Mobile
- Purely vertical, everything stacked, compact nav. Good touch target sizing.  
### Tablet
- Left `navigation panel` appears — the biggest layout jump. Content column narrows to accommodate it. Still vertically stacked within content area.  
### Desktop
- Sidebar disappears again, nav moves to top bar with full labels. Feature cards go horizontal. More whitespace. The live demo/playground at the bottom gets a wider canvas.

PANEL VISIBILITY MATRIX
 ─────────────────────────────────────────────────────────────
  Panel               Mobile      Tablet      Desktop
 ─────────────────────────────────────────────────────────────
  Sticky header       ✓ visible   ✓ visible   ✗ hidden (lg:hidden)
  Hamburger ☰         ✓ visible   ✓ visible   ✗ hidden
  Sidebar (drawer)    ✗ → on tap  ✗ → on tap  ✓ persistent (lg:flex)
  Navbar slot         inline hdr  inline hdr  ✗ (header gone)
  Main content        full width  full width  flex-1 beside sidebar
 ─────────────────────────────────────────────────────────────
  Breakpoint jump: lg (1024px) — only ONE hard cut, mobile→desktop.
  Tablet is NOT a distinct layout. Same as mobile until lg fires.

---
## Page Templates  





These are layout standards, pages must one of these templates and bind to the behaviors that the 
### `CanvasTemplate` 
  
The home page of wod-wiki. It uses the `canvas` template, which means it renders as a **scroll-driven two-column layout** — a scrolling left column of content sections, with a **sticky right panel** that hosts a live editor/timer view. As the user scrolls, the sticky panel transitions through states synchronized to the narrative.  

```
┌─────────────────────────┬─────────────────────────┐
│  Left (60%)             │  Right (sticky, ~45%)   │
│  Scrolling content      │  Live editor/timer view │
│  sections               │  (home-demo or browse)  │
└─────────────────────────┴─────────────────────────┘
```

**the three view states (**`**home-demo**`**)**  
  
The sticky panel runs a named view `home-demo` with three states driven by `command` blocks as the user scrolls:  
  
- `**note**` — editor mode, write/edit the workout  
- `**track**` — live timer, counting down blocks  
- `**review**` — post-workout results and analytics  
  
Each act's `command` block fires a pipeline that calls `set-source` + `set-state` to transition the panel without a page reload.  
  
---  
  
**Goals**  
  
1. **Narrative-driven product demo** — the page tells a three-act story (write → track → review) while the right panel performs it live  
2. **Zero friction onboarding** — user sees the product working before any signup or navigation  
3. **Library discovery** — browse-demo section exposes the workout library inline  
4. **Journal entry point** — direct link to today's log without hunting through nav  
  
The template is essentially a scrollytelling landing page where the sticky editor panel is the interactive protagonist.
### `CalendarTemplate`

```
Desktop:
┌──────────────────────────────────────────────────────┬──────────────────┐
│  Note Column (sticky header + editor, max-w 3xl)     │  Index Sidebar   │
│                                                      │  (Desktop XL     │
│  [Title]                          [Actions]          │   only, 320px)   │
│  ─────────────────────────────────────────────────   │                  │
│  NoteEditor (wod-wiki markdown)                      │  "On this page"  │
│                                                      │  nav links       │
└──────────────────────────────────────────────────────┴──────────────────┘

Mobile: Nav collapsed, editor full width, index in header combo box
```


### `ListTemplate`

### `NoteTemplate`

## Pages

#####  Route: `/` 
- Template: `CanvasTemplate`
- Component: `HomePage`

#####  Route: `/syntax/{slug}`
- Template: `CanvasTemplate`
- Component: `SyntaxPage`

#####  Route: `/journal` 
- Template: `CalendarTemplate`
- Component: `JounralPage`

##### Route: `/journal/{yyyy-mm-dd}`
- Template: `NoteTemplate`
- Component: `JournalNote`

edit / view rules based on date.

#####  Route: `/collections`
- Template: `ListTemplate`
- Component: `CollectionPage`

#####  Route: `/collections/{collection-name}` 
- Template: `NotePage`
- Component: `ReadOnlyNote`

#####  Route: `/feeds`
- Template: `CalendarTemplate`
- Component: `FeedPage`

#####  Route: `/feeds/{collection-name}` 
- Template: `NotePage`
- Component: `ReadOnlyNote`
