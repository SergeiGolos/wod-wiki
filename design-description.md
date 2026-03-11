# WOD.WIKI Design Description

This document provides a detailed technical and visual description of the WOD.WIKI web application (`dev:app`). It is intended for designers to use as a baseline for creating mobile-native or mobile-optimized designs.

## Table of Contents
1. [Global Application Shell](#global-application-shell)
2. [Screen 1: Library (Notebooks & Collections)](#screen-1-library-notebooks--collections)
3. [Screen 2: Workbench - Plan (Editor)](#screen-2-workbench---plan-editor)
4. [Screen 3: Workbench - Track (Timer)](#screen-3-workbench---track-timer)
5. [Screen 4: Workbench - Review (Analytics)](#screen-4-workbench---review-analytics)
6. [Visual System & Styling](#visual-system--styling)

---

## Global Application Shell

The application follows a **"Sliding Viewport"** layout model. The entire app is treated as a horizontal strip of panels, and the user navigates by sliding the viewport between three primary modes: **Plan**, **Track**, and **Review**.

### Functionality
- **Responsive Breakpoints:**
  - **Desktop (≥1024px):** Side-by-side panels.
  - **Tablet (768-1024px):** Stacked panels with bottom sheets for secondary information.
  - **Mobile (<768px):** Full-screen slides.
- **Top Navigation Bar:**
  - **Logo:** "WOD.WIKI" (using a "Commit Graph" pixel art aesthetic).
  - **Command Palette (⌘K):** Search and quick navigation.
  - **View Toggles:** SM-sized buttons with icons (Lock/Edit for Plan, Play for Track, BarChart for Review).
  - **Attachments:** Upload and manage GPX or image files.
  - **Details Toggle:** Sidebar for note metadata (Title, Target Date, Tags).

---

## Screen 1: Library (Notebooks & Collections)

This is the landing view where users manage their workout history and curated collections.

### Sections & Components
- **Filter Sidebar (Left):**
  - **Calendar View:** A dense grid used for selecting specific days, ranges (Shift+Click), or multiple dates (Ctrl+Click).
  - **Notebook Selector:** List of folders/notebooks (e.g., "Daily Log", "Strength").
- **List of Notes (Center):**
  - Card-based list showing workout title, date, and completion status.
  - Swipe actions (implied) or buttons for Edit, Clone, and Notebook management.
- **Preview/Analyze Panel (Right):**
  - If one note is selected: Shows a summary of the workout content and a "Run" button.
  - If multiple are selected: Shows an **Analyze Panel** with aggregated stats (Total Volume, ACWR, Intensity over time).

---

## Screen 2: Workbench - Plan (Editor)

The design interface where workouts are written using WODScript (Markdown-based).

### Sections & Components
- **Markdown Editor:**
  - Full-featured text editor with syntax highlighting for workout terms (reps, sets, timers).
  - Line highlighting that syncs with the current execution point in the timer.
- **Editor Index (Outline):**
  - A table of contents view showing all detected workout blocks within the script.
  - Each block has a "Run" icon to jump straight to tracking that specific segment.

---

## Screen 3: Workbench - Track (Timer)

The "Execution" mode used during a workout.

### Sections & Components
- **Visual State Panel (Left in Desktop):**
  - A vertical stack reflecting the current "Breadcrumbs" of the workout logic.
  - Shows completed segments vs. what is currently active.
- **Central Timer View (Right/Main):**
  - **Floating Analytics Bubbles:** (New) Semi-transparent pills floating above the clock showing session-wide totals (Total Reps, Volume, etc.).
  - **Active Exercise Label:** Big, bold text showing the current movement (e.g., "10 Squats").
  - **Main Clock:** Large high-contrast digits (MM:SS) inside a circular progress ring.
  - **Secondary Timers:** Smaller clocks for parent intervals (e.g., overall AMRAP time vs. current rest period).
- **Controls (Bottom):**
  - Large Primary Action button (Play/Pause).
  - Secondary buttons for "Stop" and "Next Segment".

---

## Screen 4: Workbench - Review (Analytics)

The post-workout summary view.

### Sections & Components
- **Timeline View:**
  - A chronological breakdown of every completed segment.
  - Shows specific metrics collected (e.g., "Set 1: 15 reps at 100kg").
- **Analytics Grid:**
  - High-fidelity charts and tables showing:
    - **Volume Load:** Σ(Reps * Weight).
    - **Intensity:** Relative effort levels.
    - **Met-Minutes:** Cardiovascular load.
    - **ACWR:** Acute:Chronic Workload Ratio (injury prevention metric).

---

## Visual System & Styling

### Typography
- **Headings:** Sans-serif, bold, tight letter spacing (Inter or system default).
- **Timer Digits:** Monospace or tabular numerals for zero-jitter during ticking.
- **Code/Pixel Art:** Used for the logo and certain technical badges.

### Color Palette
- **Primary:** Bright Blue (#3b82f6) used for active states, progress bars, and "Play" buttons.
- **Background:** 
  - Light Mode: Clean white with subtle slate-50/100 accents.
  - Dark Mode: Deep slate/black with semi-transparent glass effects.
- **Status Colors:**
  - Green (Success/Complete)
  - Yellow (Changed/Warning)
  - Red (Destructive/Error)

### Key Assets
- **Icons:** Lucide Icon set (Activity, Layers, Sigma, Sparkles, Target, Sigma).
- **Glassmorphism:** Heavy use of `backdrop-blur` and low-opacity borders for floating UI elements like the new Analytics Bubbles.
- **Progress Indicators:** Simple linear bars and circular rings with rounded caps.
