# WOD Wiki Color Audit — Current State

> **Generated:** 2026-04-14  
> **Scope:** All display areas where workout metrics are rendered — Monaco code editor, fragment pills, companion panels, runtime status, and timer/clock components.

---

## 1. Metric Colors by Display Area

Colors assigned to each metric type across the four main rendering surfaces.

| Metric | Editor Token (hex) | Fragment Pill (light) | Companion Panel | Inline Panel text / border |
|--------|-------------------|----------------------|-----------------|---------------------------|
| **Duration / Time** | `#3b82f6` | `bg-blue-100 text-blue-800` | `bg-blue-500/10` | `text-blue-600 / border-blue-500/30` |
| **Rep** | `#f97316` | `bg-green-100 text-green-800` | `bg-orange-500/10` | `text-orange-600 / border-orange-500/30` |
| **Effort / Exercise** | `#22c55e` | `bg-yellow-100 text-yellow-800` | `bg-green-500/10` | `text-green-600 / border-green-500/30` |
| **Rounds** | `#a855f7` | `bg-purple-100 text-purple-800` | `bg-purple-500/10` | `text-purple-600 / border-purple-500/30` |
| **Distance** | `#06b6d4` | `bg-teal-100 text-teal-800` | `bg-teal-500/10` | `text-cyan-600 / border-cyan-500/30` |
| **Resistance / Weight** | `#ef4444` | `bg-red-100 text-red-800` | `bg-red-500/10` | `text-red-600 / border-red-500/30` |
| **Action** | `#eab308` | `bg-pink-100 text-pink-800` | `bg-yellow-500/10` | `text-yellow-600 / border-yellow-500/30` |
| **Lap** | — | `bg-orange-100 text-orange-800` | — | — |
| **Elapsed** | — | `bg-sky-100 text-sky-800` | — | — |
| **Spans** | — | `bg-cyan-100 text-cyan-800` | — | — |
| **Increment** | — | `bg-indigo-100 text-indigo-800` | — | — |
| **Text** | — | `bg-gray-100 text-gray-800` | — | — |

### Dark Mode Fragment Pills

| Metric | Dark Variant |
|--------|-------------|
| **Duration / Time** | `bg-blue-900/50 border-blue-800 text-blue-100` |
| **Rep** | `bg-green-900/50 border-green-800 text-green-100` |
| **Effort / Exercise** | `bg-yellow-900/50 border-yellow-800 text-yellow-100` |
| **Rounds** | `bg-purple-900/50 border-purple-800 text-purple-100` |
| **Distance** | `bg-teal-900/50 border-teal-800 text-teal-100` |
| **Resistance / Weight** | `bg-red-900/50 border-red-800 text-red-100` |
| **Action** | `bg-pink-900/50 border-pink-800 text-pink-100` |

---

## 2. Runtime State Colors

| State | Editor Gutter | Block Status Dot | Status Footer | Status Badge |
|-------|--------------|-----------------|---------------|--------------|
| **Executing / Running** | `#22c55e` + pulse | `bg-blue-500` animate-pulse | `text-green-400 bg-green-900/20` | `bg-blue-600 text-white` |
| **Complete** | — | `bg-green-500` | `text-blue-400 bg-blue-900/20` | `bg-green-600 text-white` |
| **Paused** | — | — | `text-yellow-400 bg-yellow-900/20` | `bg-yellow-600 text-white` |
| **Idle / Pending** | — | `bg-gray-400` | `text-gray-400 bg-gray-900/20` | `bg-muted text-muted-foreground` |
| **Error** | `#ef4444` | `bg-red-500` | `text-red-400 bg-red-900/20` | `bg-destructive` |
| **Warning** | `#f59e0b` | — | — | — |
| **Info** | `#3b82f6` | — | — | — |

---

## 3. Timer / Clock Colors

### Progress Bar

| Zone | Fill Color | Range |
|------|-----------|-------|
| Normal | `bg-primary` (CSS var) | 0 – 70% |
| Warning | `bg-yellow-500` (hardcoded) | 70 – 90% |
| Critical | `bg-red-500` (hardcoded) | 90 – 100% |
| Track | `bg-secondary` (CSS var) | — |

### Time Display

| Element | Running | Stopped |
|---------|---------|---------|
| Time text | `text-primary` | `text-foreground` |
| Status dot | `bg-green-500` | `bg-gray-400` |
| Round badge | `bg-secondary text-secondary-foreground` | same |

### Control Buttons

| Button | Default | Hover |
|--------|---------|-------|
| Start | `bg-green-500` | `bg-green-600` |
| Resume | `bg-blue-500` | `bg-blue-600` |
| Pause | `bg-yellow-500` | `bg-yellow-600` |
| Stop | `bg-red-500` | `bg-red-600` |
| Reset | `bg-gray-500` | `bg-gray-600` |

---

## 4. Editor Decorations

| Element | Active / Running | Inactive |
|---------|-----------------|---------|
| WOD block background | `bg-blue-500/10` | `bg-yellow-500/5` |
| WOD block border-left | `border-blue-500` 2px | `border-yellow-500/30` 2px |
| Active line highlight | `rgba(129,140,248,0.08)` | — |
| Selection (focused) | `rgba(129,140,248,0.35)` | `rgba(30,100,230,0.25)` |
| Unfocused token tint | All metric hex @ 33% opacity | — |

### Base Theme

| Element | Light Mode | Dark Mode |
|---------|-----------|----------|
| Gutter background | `#F5F7FF` | `#252841` |
| Gutter text | `#717D96` | `#A0AEC0` |

---

## 5. Observed Issues

### Issue 1 — Hardcoded hex values in the editor don't respond to theming

Editor token underline colors (`#3b82f6`, `#f97316`, `#22c55e`, etc.) are raw hex strings defined in extension files. They are not CSS variables and will not change when the design-system theme changes (e.g., switching to the new pastel palette or toggling dark mode).

**Files affected:**
- `src/components/Editor/extensions/cursor-focus-panel.ts`
- `src/components/Editor/extensions/wod-decorations.ts`
- `src/components/Editor/extensions/gutter-unified.ts`

---

### Issue 2 — Rep and Action color mapping is inconsistent across surfaces

| Surface | Rep color | Action color |
|---------|-----------|-------------|
| Editor token | orange (`#f97316`) | yellow (`#eab308`) |
| Fragment pill | **green** | **pink** |
| Companion panel | orange | yellow |
| Inline panel | orange | yellow |

Fragment pills use completely different hues for Rep (green instead of orange) and Action (pink instead of yellow), breaking visual consistency when the same metric appears in multiple surfaces simultaneously.

**Files affected:**
- `src/views/runtime/metricColorMap.ts`

---

### Issue 3 — "Executing" state maps to two different colors

| Surface | Executing color |
|---------|----------------|
| Editor gutter | green (`#22c55e`) |
| Status footer | green (`text-green-400`) |
| Block status dot | **blue** (`bg-blue-500`) |
| Status badge | **blue** (`bg-blue-600`) |

The same semantic state — "currently running" — is rendered as green in some components and blue in others.

**Files affected:**
- `src/runtime/components/BlockTimerDisplay.tsx`
- `src/runtime-test-bench/components/StatusFooter.tsx`
- `src/runtime-test-bench/styles/tailwind-components.ts`
- `src/components/workout/RuntimeDebugPanel.tsx`

---

### Issue 4 — Timer warning/critical zones use hardcoded Tailwind colors

The progress bar threshold colors (`bg-yellow-500`, `bg-red-500`) are hardcoded and not derived from design-system variables (`--destructive`, `--warning`). They won't adapt to theme overrides.

**Files affected:**
- `src/clock/components/DigitalClock.tsx`

---

### Issue 5 — No `--warning` CSS variable exists

The design system defines `--destructive` but has no `--warning` token. Warning states fall back to hardcoded amber/yellow values across runtime status, gutter, and timer progress.

**Files affected:**
- `src/index.css` (missing variable)
- All files using `bg-yellow-*` / `text-yellow-*` for semantic warning states

---

### Issue 6 — Fragment pills are not pastel-aware

Fragment pill colors use full Tailwind scale colors (`blue-100`, `green-100`, etc.) which are not derived from CSS variables. With the new pastel design system in place, pills remain the old vivid-tinted style rather than harmonising with the softer palette.

**Files affected:**
- `src/views/runtime/metricColorMap.ts`
