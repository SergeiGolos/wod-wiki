# WOD Wiki - Visual Design Reference

Quick visual reference for the recommended branding direction. See [design-brief-for-branding.md](./design-brief-for-branding.md) for complete details.

---

## 🎨 Recommended Logo: The Workout Clock

```
     12 o'clock: #
         ╱│╲
       ╱  │  ╲
     ╱    │    ╲
  + ─────┼─────── : (timer hands form "W")
9    ╲    │    ╱   3
      ╲   │   ╱
       ╲  │  ╱
         ╲│╱
     6 o'clock: -
```

**Concept:**
- Circular timer face with clean, modern design
- Workout symbols at key positions instead of numbers
- Timer hands positioned to form stylized "W"
- Segmented outer ring suggests interval training
- Minimalist, scalable, memorable

---

## 🌈 Recommended Color Palette: Athletic Tech

### Primary Colors

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🔵 ELECTRIC BLUE      🟠 BRIGHT ORANGE    🟣 DEEP PURPLE      │
│  #0EA5E9               #F97316              #7C3AED            │
│  Primary Brand         Energy & Urgency     Analytics          │
│  HSL(199°, 89%, 48%)  HSL(25°, 95%, 53%)   HSL(258°, 84%, 57%)│
│                                                                 │
│  🟢 VIBRANT GREEN      ⚫ SLATE GRAY                            │
│  #10B981               #475569                                 │
│  Success & Progress    Text & Neutrals                         │
│  HSL(158°, 78%, 39%)  HSL(216°, 12%, 36%)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Usage Guide

| Color | Primary Use | Secondary Use | Avoid |
|-------|-------------|---------------|-------|
| **Blue** | Timers, links, primary buttons | Editor highlights, focus states | Large background fills |
| **Orange** | Active states, countdown, CTAs | Hover states, warnings | Body text (readability) |
| **Purple** | Charts, analytics, metrics | Data points, badges | Primary actions |
| **Green** | Completion, success, progress | "Go" signals, positive metrics | Error messages |
| **Gray** | Text, borders, backgrounds | Disabled states, labels | Accent colors |

### Color Combinations

**High Energy (Workout Active):**
- Background: White `#FFFFFF`
- Primary: Electric Blue `#0EA5E9`
- Accent: Bright Orange `#F97316`
- Text: Slate Gray `#475569`

**Data Focus (Analytics View):**
- Background: Very Light Gray `#F8FAFC`
- Primary: Deep Purple `#7C3AED`
- Accent: Electric Blue `#0EA5E9`
- Text: Dark Gray `#1E293B`

**Success State (Workout Complete):**
- Background: Light Green `#ECFDF5`
- Primary: Vibrant Green `#10B981`
- Accent: Electric Blue `#0EA5E9`
- Text: Dark Green `#065F46`

---

## 📝 Recommended Typography: Inter

### Font Stack

```css
/* Primary Font - Inter */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Code Font - JetBrains Mono */
font-family: 'JetBrains Mono', 'Courier New', Consolas, 
             Monaco, monospace;
```

### Type Scale

```
Hero Title     72px / 4.5rem   Inter Extra Bold
H1             48px / 3rem     Inter Bold
H2             36px / 2.25rem  Inter Semi-Bold
H3             28px / 1.75rem  Inter Semi-Bold
H4             24px / 1.5rem   Inter Medium
Body Large     18px / 1.125rem Inter Regular
Body           16px / 1rem     Inter Regular
Small          14px / 0.875rem Inter Regular
Tiny           12px / 0.75rem  Inter Medium
```

### Example Usage

**Logo Wordmark:**
```
WOD WIKI
Inter Bold, 36px, Letter-spacing: -0.02em
Color: Electric Blue #0EA5E9
```

**Primary Heading:**
```
Parse Your Workout
Inter Semi-Bold, 48px, Line-height: 1.2
Color: Slate Gray #475569
```

**Body Text:**
```
WOD Wiki transforms human-readable workout markdown 
into executable, trackable fitness programs.

Inter Regular, 16px, Line-height: 1.6
Color: Slate Gray #475569
```

**Code Display:**
```
20:00 AMRAP
  (21-15-9)
    Thrusters 95lb
    Pullups

JetBrains Mono Regular, 14px, Line-height: 1.5
Color: Deep Purple #7C3AED (syntax colored)
```

---

## 🎯 Visual Style Guidelines

### Shape Language

**Rounded Rectangles (Primary):**
```
┌──────────────┐
│  Button      │  border-radius: 8px
└──────────────┘

┌────────────────────┐
│                    │
│  Card Container    │  border-radius: 12px
│                    │
└────────────────────┘
```

**Circles (Timers, Icons):**
```
    ⬤  16px icon
   ⬤⬤  24px button
  ⬤⬤⬤  128px timer face
```

**Sharp Angles (Code Blocks):**
```
┌─────────────┐
│ code block  │  border-radius: 4px
└─────────────┘
```

### Spacing System (8-Point Grid)

```
4px   ▪        Micro-spacing (icon gaps)
8px   ▪▪       Small (button padding)
16px  ▪▪▪▪     Medium (card padding)
24px  ▪▪▪▪▪▪   Large (section spacing)
32px  ▪▪▪▪▪▪▪▪ XL (component gaps)
48px  ...       2XL (page margins)
64px  ...       3XL (hero spacing)
```

### Elevation (Shadows)

**Level 1 - Subtle (Cards):**
```
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

**Level 2 - Moderate (Dropdowns):**
```
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -2px rgba(0, 0, 0, 0.1);
```

**Level 3 - Strong (Modals):**
```
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -4px rgba(0, 0, 0, 0.1);
```

---

## 🎬 Animation Guidelines

### Timing

```
Fast:    100-200ms  │─────│  Hovers, focus states
Medium:  200-300ms  │─────────│  Dropdowns, modals
Slow:    300-500ms  │─────────────│  Page transitions
```

### Easing Functions

```
Ease-out:     │╲
              │ ╲___  Elements entering (appearing)
              
Ease-in:      ___╱│
              ╱   │  Elements exiting (disappearing)
              
Ease-in-out:  │╲ ╱│
              │ ╳ │  State changes (toggles)
```

### Example Animations

**Button Hover:**
```css
transition: all 150ms ease-out;
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
```

**Modal Enter:**
```css
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
animation: modalEnter 250ms ease-out;
```

**Timer Pulse (Active):**
```css
@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
animation: timerPulse 1000ms ease-in-out infinite;
```

---

## 🖼️ Component Examples

### Primary Button

```
┌──────────────────────┐
│   ▶ Start Workout    │  Background: Electric Blue #0EA5E9
└──────────────────────┘  Text: White #FFFFFF
                          Padding: 12px 24px
                          Border-radius: 8px
                          Font: Inter Medium 16px
                          Shadow: Level 1
                          
:hover State:
┌──────────────────────┐
│   ▶ Start Workout    │  Background: Darker Blue #0284C7
└──────────────────────┘  Shadow: Level 2
                          Transform: translateY(-2px)
```

### Timer Display

```
    ╭────────────────╮
    │                │
    │    03:24.57    │   Font: JetBrains Mono Bold 72px
    │                │   Color: Electric Blue #0EA5E9
    │    Running     │   Status: Inter Regular 18px
    │                │   Background: White with subtle shadow
    ╰────────────────╯
```

### Analytics Card

```
┌─────────────────────────────┐
│  💪 Total Volume             │  Header: Inter Semi-Bold 18px
│                              │  
│  ╭─ 12,450 kg               │  Metric: JetBrains Mono Bold 36px
│  │                           │  Color: Deep Purple #7C3AED
│  │     ╱╲                    │  
│  │    ╱  ╲  ╱╲              │  Chart: Line graph
│  │   ╱    ╲╱  ╲             │  Color: Electric Blue #0EA5E9
│  ╰──────────────────────────│
│                              │
│  +15% from last week  ↗      │  Trend: Vibrant Green #10B981
└─────────────────────────────┘
```

### Code Block (Monaco Editor)

```
┌─────────────────────────────────────┐
│ 1  timer 20:00 AMRAP                │  Background: #1E293B
│ 2    (21-15-9)                      │  
│ 3      Thrusters 95lb               │  Syntax Colors:
│ 4      Pullups                      │  • timer: Electric Blue
│ 5                                   │  • numbers: Deep Purple
└─────────────────────────────────────┘  • exercises: Orange
                                          • (rounds): Vibrant Green
```

---

## 🎨 Monaco Editor Theme

### Syntax Highlighting Colors

```typescript
// WOD Wiki Monaco Theme
{
  base: 'vs-dark',
  colors: {
    'editor.background': '#1E293B',        // Slate 800
    'editor.foreground': '#F1F5F9',        // Slate 100
    'editorLineNumber.foreground': '#64748B', // Slate 500
    'editorCursor.foreground': '#0EA5E9',  // Electric Blue
    'editor.selectionBackground': '#0EA5E933', // Blue with opacity
  },
  rules: [
    { token: 'timer',       foreground: '0EA5E9', fontStyle: 'bold' },  // Blue
    { token: 'effort',      foreground: 'F97316' },                      // Orange
    { token: 'resistance',  foreground: '7C3AED' },                      // Purple
    { token: 'repetitions', foreground: '10B981' },                      // Green
    { token: 'action',      foreground: 'F59E0B', fontStyle: 'italic' }, // Amber
    { token: 'rounds',      foreground: '10B981' },                      // Green
    { token: 'distance',    foreground: '06B6D4' },                      // Cyan
  ]
}
```

### Example Highlighted Code

```
timer 20:00 AMRAP        ← Blue, bold
  (21-15-9)              ← Green
    Thrusters 95lb       ← "Thrusters": Orange, "95lb": Purple
    Pullups              ← Orange
```

---

## 🏷️ Iconography Style

### Icon Specifications

- **Style:** Stroke-based (outline)
- **Stroke Width:** 2px
- **Stroke Cap:** Rounded
- **Sizes:** 16px, 20px, 24px, 32px
- **Library:** Phosphor Icons or Lucide React

### Key Icons

```
⏱️  Timer/Stopwatch    (workout tracking)
▶️  Play               (start workout)
⏸️  Pause              (pause timer)
⏹️  Stop               (end workout)
↻   Reset              (reset timer)
📊  Chart              (analytics)
💪  Dumbbell           (exercise)
📝  Document           (markdown)
{} Code                (syntax)
✓   Check              (completion)
⚡  Lightning          (energy/power)
```

### Icon Usage

**Buttons:**
```
┌─────────────┐
│  ▶ Start    │  Icon: 16px, Color: White
└─────────────┘  Text: Inter Medium 14px
```

**Navigation:**
```
📊 Analytics        Icon: 20px, Color: Slate Gray
💪 Exercises        Hover: Electric Blue
📝 Workouts
```

---

## 📐 Layout Patterns

### Card Layout

```
┌────────────────────────────────────────┐
│  ┌──────┐                              │
│  │ Icon │  Title                       │  Padding: 24px
│  └──────┘                              │  Border-radius: 12px
│                                        │  Shadow: Level 1
│  Description text goes here and       │  Background: White
│  spans multiple lines as needed       │
│                                        │
│  ┌────────────┐  ┌────────────┐       │
│  │   Action   │  │   Action   │       │
│  └────────────┘  └────────────┘       │
└────────────────────────────────────────┘
```

### Split View Layout

```
┌─────────────────────┬──────────────────────┐
│                     │                      │
│  Monaco Editor      │   Workout Details    │
│  (Left Pane)        │   (Right Pane)       │
│                     │                      │
│  Code input with    │   • Timer display    │
│  syntax highlighting│   • Round counter    │
│                     │   • Exercise list    │
│                     │   • Analytics        │
│                     │                      │
└─────────────────────┴──────────────────────┘
      60% width             40% width
```

### Dashboard Grid

```
┌──────────┬──────────┬──────────┐
│  Metric  │  Metric  │  Metric  │
│   Card   │   Card   │   Card   │
├──────────┴──────────┴──────────┤
│                                │
│     Large Chart Area           │
│     (Performance Over Time)    │
│                                │
├─────────────────┬──────────────┤
│  Exercise List  │  Recent      │
│                 │  Workouts    │
└─────────────────┴──────────────┘
```

---

## 🌓 Dark Mode

### Dark Mode Palette

```
Background:    #0F172A  (Slate 900)
Surface:       #1E293B  (Slate 800)
Text Primary:  #F1F5F9  (Slate 100)
Text Secondary:#94A3B8  (Slate 400)
Border:        #334155  (Slate 700)

Colors maintain same hue, adjusted lightness:
Blue:    #38BDF8  (lighter than light mode)
Orange:  #FB923C  (slightly desaturated)
Purple:  #A78BFA  (lighter, softer)
Green:   #34D399  (lighter, more vibrant)
```

### Dark Mode Example

```
╔════════════════════════════════════╗
║  🌙 WOD WIKI (Dark Mode)           ║  Background: #0F172A
╠════════════════════════════════════╣
║                                    ║
║  ┌──────────────────────────────┐ ║
║  │  timer 20:00 AMRAP           │ ║  Card: #1E293B
║  │    (21-15-9)                 │ ║  Text: #F1F5F9
║  │      Thrusters 95lb          │ ║  Syntax: Adjusted colors
║  │      Pullups                 │ ║
║  └──────────────────────────────┘ ║
║                                    ║
║  ┌────────────────┐               ║
║  │  Start Workout │               ║  Button: #38BDF8
║  └────────────────┘               ║
╚════════════════════════════════════╝
```

---

## 📱 Responsive Breakpoints

```
Mobile:     320px - 639px   │ Single column, stacked
Tablet:     640px - 1023px  │││ Two columns
Desktop:    1024px - 1279px │││││ Three columns
Large:      1280px+         │││││││ Four columns, wide layouts
```

### Mobile Adaptations

- Font sizes: Reduce by 20-30%
- Button height: Minimum 44px (touch target)
- Spacing: Tighter (16px instead of 24px)
- Navigation: Hamburger menu
- Monaco Editor: Full-width, simplified toolbar

---

## ✨ Brand Applications

### GitHub README Banner

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ⏱️  WOD WIKI                                          ║
║     Compile Your Fitness                                  ║
║                                                           ║
║     Parse → Execute → Analyze                            ║
║                                                           ║
║     [GitHub Stats] [Build Status] [Version Badge]        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
Background: Gradient (Electric Blue → Deep Purple)
Text: White
Height: 200px
```

### Social Media Profile

```
┌─────────────────┐
│      ⏱️         │   Avatar: Logo icon only
│    ________     │   Background: Electric Blue
│   |        |    │   Size: 400x400px
│   |   W    |    │
│   |________|    │
└─────────────────┘

Cover: Syntax-highlighted workout code with timer
Dimensions: 1500x500px (Twitter), 820x312px (LinkedIn)
```

### Storybook Theme

```
Header: Electric Blue background
Sidebar: Light gray with blue accent for active items
Canvas: White background for components
Docs: Inter typography with syntax-highlighted code blocks
Icons: Phosphor icon set, 20px, consistent styling
```

---

## 📚 Additional Resources

- **Full Design Brief:** [design-brief-for-branding.md](./design-brief-for-branding.md)
- **Quick Summary:** [../DESIGN_BRIEF_SUMMARY.md](../DESIGN_BRIEF_SUMMARY.md)
- **Project README:** [../README.md](../README.md)
- **Architecture Docs:** [architectural-overview.md](./architectural-overview.md)

---

**Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintainer:** WOD Wiki Design Team
