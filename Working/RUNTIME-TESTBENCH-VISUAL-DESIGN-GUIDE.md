# Runtime Test Bench - Visual Design Guide

## Component Visual Hierarchy

### Color Palette Reference

#### Primary Colors (Light Mode)
```
Blue (Info/Primary):     #2563eb (bg), #dbeafe (light bg), #0c4a6e (dark text)
Green (Success):        #22c55e (success indicator)
Red (Error):            #ef4444 (error indicator)
Yellow/Amber (Warning): #f59e0b (warning indicator)
Slate (Neutral):        #f1f5f9 (light), #6b7280 (medium), #1e293b (dark)
```

#### Block Type Colors
```
Root:       Background: #f1f5f9,  Border: #cbd5e1,  Text: #1e293b
Timer:      Background: #dbeafe,  Border: #7dd3fc,  Text: #0c4a6e
Effort:     Background: #dcfce7,  Border: #86efac,  Text: #15803d
Rounds:     Background: #e9d5ff,  Border: #e879f9,  Text: #6b21a8
Completion: Background: #ccfbf1,  Border: #6ee7b7,  Text: #065f46
Idle:       Background: #f3f4f6,  Border: #d1d5db,  Text: #374151
```

---

## Component Mockups

### 1. Editor Panel - Detailed View

```
┌─ Create Workout ────────────────────────────────────┐
│                                          💡 Line 5   │
├─────────────────────────────────────────────────────┤
│ 1 │ 20:00 AMRAP                                    │
│ 2 │ 5 Pullups                                      │ ← Highlighted (orange)
│ 3 │ 10 Pushups                                     │
│ 4 │ 15 Air Squats                                  │
│ 5 │                                                │
│   │                                                │
│   │ [Editor with line numbers and syntax hilight] │
│   │ [Monaco editor providing code assistance]     │
│   │                                                │
└─────────────────────────────────────────────────────┘
```

### 2. Compilation Panel - Statement Breakdown

```
┌─ Parsed Workout (4 statements, 12 fragments) ───────┐
├──────┬──────────┬─────────────────────────────────────┤
│ Line │ Position │ Fragments                           │
├──────┼──────────┼─────────────────────────────────────┤
│  1   │ [0-10]   │ [Timer:20:00] [Effort:AMRAP]       │
├──────┼──────────┼─────────────────────────────────────┤
│  2   │ [0-9]    │ [Count:5] [Exercise:Pullups]       │
├──────┼──────────┼─────────────────────────────────────┤
│  3   │ [0-10]   │ [Count:10] [Exercise:Pushups]      │
├──────┼──────────┼─────────────────────────────────────┤
│  4   │ [0-15]   │ [Count:15] [Exercise:AirSquats]    │
└──────┴──────────┴─────────────────────────────────────┘

Fragment Legend:
  [Timer]    = Blue background
  [Effort]   = Green background
  [Count]    = Amber background
  [Exercise] = Purple background
```

### 3. Runtime Stack Panel - Block Hierarchy

```
┌─ Runtime Stack (4 blocks, Active: 4/4) ────────┐
│  ──────────────────────────────────────────── │
│ Root                            (#blocks)     │
│  ├─ TimerBlock (Timer)              [20:00]  │
│  │   ├─ EffortBlock (Effort)    [5 reps]  ← Active
│  │   │   └─ PullupBlock (Effort) [✓ Done]  │
│  │   ├─ EffortBlock (Effort)    [10 reps] │
│  │   │   └─ PushupBlock (Effort) [▶ Active]│
│  │   └─ EffortBlock (Effort)    [15 reps] │
│  └─ CompletionBlock (Completion) [Ready]    │
│                                              │
│ Nesting Levels:                              │
│   Level 0 (12px): Root                       │
│   Level 1 (24px): TimerBlock                 │
│   Level 2 (36px): EffortBlock                │
│   Level 3 (48px): ExerciseBlock              │
└────────────────────────────────────────────┘

Visual Indicators:
  ► or ▼   = Expandable/collapsed state
  ←        = Active block marker
  ✓        = Completed block
  ▶        = Currently running
  ⏸        = Paused
```

### 4. Memory Panel - Table with Popover

```
┌─ Memory Space (42 entries, 3 owners) ────────────────┐
├──────────────────────────────────────────────────────┤
│
│ Owner: blk-timer-001 (15 entries)
│ ┌─────────────────────────────────────────────────┐
│ │ ID                 │ Type         │ Children │ ✓ │
│ ├─────────────────────────────────────────────────┤
│ │ metric_001         │ metric       │    0     │ ✓ │◄─ Hover
│ │ timer-state_001    │ timer-state  │    2     │ ✓ │
│ │ spans_001          │ spans        │    8     │ ✓ │
│ │ handlers_001       │ handlers     │    1     │ ✓ │
│ └─────────────────────────────────────────────────┘
│
│ Owner: blk-effort-001 (12 entries)
│ ┌─────────────────────────────────────────────────┐
│ │ ID                 │ Type         │ Children │ ✓ │
│ ├─────────────────────────────────────────────────┤
│ │ metric_002         │ metric       │    0     │ ✓ │
│ │ loop-state_001     │ loop-state   │    1     │ ✓ │
│ └─────────────────────────────────────────────────┘
│
└──────────────────────────────────────────────────────┘

Popover (on hover):
┌──────────────────────────────────────┐
│ ● timer-state_001  [timer-state] ✓  │
│                                      │
│ Object Structure:                    │
│ {                                    │
│   "elapsed": 45230,                  │
│   "total": 1200000,                  │
│   "remaining": 1154770,              │
│   "paused": false                    │
│ }                                    │
│                                      │
│ Children: 2        Valid             │
└──────────────────────────────────────┘
```

### 5. Controls Panel - Execution State

```
┌─ Runtime Controls ──────────────────────────────────┐
│  [Next Block] [Reset]  ▶ Running  ⏳ Processing    │
│                         Block 2/5  Elapsed: 00:15   │
│                         Steps: 42                    │
│                                                     │
│  Status details:                                    │
│  • Current block: EffortBlock (Pushups)            │
│  • Memory entries: 42                              │
│  • Stack depth: 4                                  │
│  • Elapsed time: 15.234 seconds                    │
│  • Events queued: 0                                │
└─────────────────────────────────────────────────────┘

Button States:
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Next Blk │ │ Reset   │ │ Refresh │ │ Export  │
│(enabled)│ │(enabled)│ │(enabled)│ │(enabled)│
└─────────┘ └─────────┘ └─────────┘ └─────────┘

When processing:
┌──────────────┐ ┌─────────┐
│Processing... │ │ Reset   │
│(disabled)    │ │(enabled)│
└──────────────┘ └─────────┘

When complete:
┌──────────────┐ ┌──────────┐
│Next Block    │ │ Restart  │
│(disabled)    │ │(enabled) │
└──────────────┘ └──────────┘
```

---

## Typography System

### Font Sizes
```
xs:  0.75rem (12px)   - Labels, badges, metadata
sm:  0.875rem (14px)  - Table text, secondary content
md:  1rem (16px)      - Body text, standard UI
lg:  1.125rem (18px)  - Section headers
xl:  1.25rem (20px)   - Panel titles
2xl: 1.5rem (24px)    - Main page title
```

### Font Weights
```
Light (300):   Disabled text, hints
Regular (400): Body text
Medium (500):  Labels, secondary headings
Semibold (600): Headers, emphasized text
Bold (700):    Important values, highlights
```

### Monospace Font
```
Font Family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
Use for:     Block keys, memory IDs, code blocks, line numbers
Size:        0.75rem for compact, 0.875rem for readable
```

---

## Spacing System

### Padding & Margins
```
xs:  0.25rem (4px)   - Tight spacing
sm:  0.5rem (8px)    - Compact items
md:  1rem (16px)     - Standard padding
lg:  1.5rem (24px)   - Generous spacing
xl:  2rem (32px)     - Large sections
```

### Component Padding
```
Panel header:    0.75rem (12px vertical), 1rem (16px horizontal)
Panel body:      1rem (16px)
Table cell:      0.5rem (8px)
Button:          0.5rem (8px) vertical, 1rem (16px) horizontal
Card:            1rem (16px)
```

---

## Shadow System

### Elevation Levels
```
sm:  0 1px 2px rgba(0,0,0,0.05)        - Subtle, cards on paper
md:  0 4px 6px rgba(0,0,0,0.1)         - Standard UI elements
lg:  0 10px 15px rgba(0,0,0,0.1)       - Floating panels, modals
xl:  0 20px 25px rgba(0,0,0,0.1)       - Popovers, dropdowns
```

### Usage
```
Panels:     md shadow (0 4px 6px)
Hoverable:  md shadow, lg on hover
Popovers:   xl shadow (0 20px 25px)
Modals:     xl shadow + backdrop
Buttons:    No shadow (except on active press)
```

---

## Transition & Animation System

### Timing
```
Fast:     0.15s    (hover states, quick feedback)
Standard: 0.2s     (most interactions)
Slow:     0.3s     (panel slides, major layout changes)
```

### Easing
```
ease-in-out: Standard cubic-bezier(0.4, 0, 0.2, 1)
ease-in:     Emphasis on start cubic-bezier(0.4, 0, 1, 1)
ease-out:    Emphasis on end cubic-bezier(0, 0, 0.2, 1)
```

### Common Transitions
```
Hover on row:          background-color 0.2s ease-in-out
Panel appearance:      opacity 0.3s ease-out
Button press:          background-color 0.15s ease-in-out
Popover show:          opacity 0.2s ease-out
Scroll animation:      smooth
```

---

## Interaction States

### Button States
```
Default:
  Background: #2563eb
  Text:       white
  Cursor:     pointer

Hover:
  Background: #1d4ed8
  Cursor:     pointer
  Shadow:     md

Active (pressed):
  Background: #1e40af
  Shadow:     none

Disabled:
  Background: #d1d5db
  Text:       #9ca3af
  Cursor:     not-allowed
  Opacity:    50%
```

### Row/Item States
```
Default:
  Background: white
  Border:     transparent

Hover:
  Background: #f9fafb
  Cursor:     pointer
  Transition: 0.2s

Selected:
  Background: #eff6ff
  Border:     3px solid #2563eb
  
Active:
  Background: #eff6ff
  Border:     3px solid #2563eb
  Box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1)

Highlighted (cross-panel):
  Background: #dbeafe
  Border-left: 3px solid #0284c7
```

---

## Layout Grid Details

### Desktop Layout (1920px+)
```
Main Container: max-width 1600px, mx-auto, px-4

Grid:
┌───────────────────────────────────────┐
│  Editor (35%)  │  Compilation (65%)   │ h-96
├────────────────┼─────────────────────┤
│  Stack (35%)   │  Memory (65%)        │ h-96
└───────────────────────────────────────┘

Gap between columns: 1.5rem (24px)
Gap between rows: 1.5rem (24px)
```

### Tablet Layout (768px - 1024px)
```
Grid: single column, full width

┌──────────────────────────────────┐
│ Editor                  │ full   │ h-64
├────────────────────────────────────┤
│ Compilation             │ full   │ h-64
├────────────────────────────────────┤
│ Stack / Memory (tabbed) │ full   │ h-96
├────────────────────────────────────┤
│ Controls                │ full   │ h-auto
└────────────────────────────────────┘

Gap between sections: 1rem (16px)
```

### Mobile Layout (≤768px)
```
Single column, full width

┌──────────────────┐
│ Toolbar          │ h-14
├──────────────────┤
│ Editor           │ h-48
├──────────────────┤
│ Controls         │ h-auto
├──────────────────┤
│ Runtime (sheet)  │ h-96 (bottom sheet)
└──────────────────┘

Bottom sheets:
- Tap panel name to open
- Swipe down to dismiss
- Full-height overlay
```

---

## Badge & Tag Styling

### Block Type Tags
```
┌──────────────┐
│ Timer        │ bg-blue-100, text-blue-900, px-2 py-1, rounded
└──────────────┘

┌──────────────┐
│ Effort       │ bg-green-100, text-green-900, px-2 py-1, rounded
└──────────────┘

┌──────────────┐
│ Rounds       │ bg-purple-100, text-purple-900, px-2 py-1, rounded
└──────────────┘
```

### Status Badges
```
✓ Valid       bg-green-100, text-green-700, font-medium
⚠ Warning     bg-yellow-100, text-yellow-700, font-medium
✗ Error       bg-red-100, text-red-700, font-medium
ℹ Info        bg-blue-100, text-blue-700, font-medium
```

### Memory Type Badges
```
metric        bg-blue-100, text-blue-700
timer-state   bg-cyan-100, text-cyan-700
loop-state    bg-purple-100, text-purple-700
handlers      bg-green-100, text-green-700
spans         bg-orange-100, text-orange-700
```

---

## Accessibility Indicators

### Focus State
```
All interactive elements:
  Outline: 2px solid #2563eb
  Outline-offset: 2px
  Visible on tab navigation
  Color contrast ratio: ≥4.5:1 for AA compliance
```

### Status Indicators
```
Never use color alone - combine with icon/text:

✓ Valid:    Green dot + "Valid" text
✗ Invalid:  Red dot + "Invalid" text
⚠ Stale:    Yellow dot + "Stale" text

Audio cue on error (optional):
  Short beep or notification sound
```

### Screen Reader Text
```
<span class="sr-only">
  Currently executing Timer block, 20 minutes remaining
</span>

<button aria-label="Execute next block">
  Next Block
</button>
```

---

## Responsive Typography

### Desktop
```
Panel title:        1.25rem (20px), bold
Section header:     1.125rem (18px), semibold
Table header:       0.875rem (14px), uppercase, semibold
Table cell:         0.875rem (14px), regular
Label:              0.75rem (12px), medium
```

### Tablet
```
Panel title:        1.125rem (18px), bold
Section header:     1rem (16px), semibold
Table header:       0.75rem (12px), uppercase, semibold
Table cell:         0.75rem (12px), regular
```

### Mobile
```
Panel title:        1rem (16px), bold
Section header:     0.875rem (14px), semibold
Table header:       0.75rem (12px), uppercase, medium
Table cell:         0.75rem (12px), regular
```

---

## Dark Mode (Optional Future)

### Color Adjustments
```
Light backgrounds:  #1f2937 (instead of white)
Light text:         #f3f4f6 (instead of #1e293b)
Borders:            #4b5563 (instead of #e5e7eb)
Hover backgrounds:  #374151 (instead of #f9fafb)

Maintain contrast ratios:
  Text on dark:     Light text, ≥4.5:1 ratio
  Accents:          Increased brightness/saturation
  Shadows:          Subtler (more transparent)
```

---

## Component Library

### Pre-built Tailwind Classes

```html
<!-- Block Card -->
<div class="border rounded px-3 py-2 mb-1 flex items-center gap-2 text-sm 
            bg-blue-100 border-blue-300 hover:bg-blue-200 
            transition-all cursor-pointer">
  <!-- Block content -->
</div>

<!-- Memory Table Row -->
<tr class="border-t hover:bg-gray-50 transition-colors">
  <td class="px-3 py-2 text-xs text-gray-600 font-mono"></td>
  <td class="px-3 py-2 text-xs"></td>
</tr>

<!-- Status Badge -->
<span class="px-2 py-1 rounded-full text-xs font-medium 
           bg-green-100 text-green-700">
  ✓ Valid
</span>

<!-- Popover -->
<div class="fixed bg-white rounded-lg shadow-2xl border border-gray-200 
            p-4 max-w-sm max-h-80 overflow-auto z-50">
  <!-- Popover content -->
</div>
```

---

## Print Styles (Future Feature)

When exporting/printing runtime state:
```css
@media print {
  .no-print { display: none; }
  .print-only { display: block; }
  
  /* Monospace for code output */
  .stack, .memory { font-family: monospace; }
  
  /* Remove shadows, simplify colors */
  * { box-shadow: none; }
  
  /* Page breaks */
  .memory-group { page-break-inside: avoid; }
}
```

---

**Document Version**: 1.0  
**Status**: Design Reference  
**Use for**: Building components, maintaining consistency, accessibility verification
