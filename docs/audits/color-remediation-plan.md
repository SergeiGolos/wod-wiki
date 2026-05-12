# WOD Wiki Color Remediation Plan

> **Purpose:** Fix the six issues identified in [color-audit.md](./color-audit.md) in a safe, incremental way.  
> Each phase is independently shippable. Later phases build on earlier ones but do not require them to be complete first.

---

## Phase 1 — Establish a complete semantic color token set

**Goal:** Define all missing CSS variables so every subsequent phase can reference tokens instead of hardcoding values.

### Changes

**`src/index.css`** — add tokens to both `:root` and `.dark`

```css
/* Semantic state tokens */
--warning:              45 80% 58%;      /* amber — paused, caution */
--warning-foreground:   0 0% 100%;

/* Per-metric tokens — light */
--metric-time:          212 60% 58%;     /* soft blue */
--metric-rep:           25 70% 60%;      /* soft orange */
--metric-effort:        142 40% 55%;     /* soft green */
--metric-rounds:        270 45% 62%;     /* soft purple */
--metric-distance:      185 50% 52%;     /* soft cyan/teal */
--metric-resistance:    0 45% 62%;       /* soft red */
--metric-action:        42 65% 58%;      /* soft amber */
--metric-lap:           20 60% 60%;      /* soft orange-red */
--metric-elapsed:       200 50% 58%;     /* soft sky */
--metric-spans:         190 45% 55%;     /* soft cyan */
--metric-increment:     240 45% 62%;     /* soft indigo */
--metric-text:          0 0% 55%;        /* neutral grey */
```

**Tailwind config** — expose the new tokens as Tailwind color utilities in `tailwind.config.cjs`:

```js
warning: {
  DEFAULT: "hsl(var(--warning))",
  foreground: "hsl(var(--warning-foreground))",
},
metric: {
  time:       "hsl(var(--metric-time))",
  rep:        "hsl(var(--metric-rep))",
  effort:     "hsl(var(--metric-effort))",
  rounds:     "hsl(var(--metric-rounds))",
  distance:   "hsl(var(--metric-distance))",
  resistance: "hsl(var(--metric-resistance))",
  action:     "hsl(var(--metric-action))",
  lap:        "hsl(var(--metric-lap))",
  elapsed:    "hsl(var(--metric-elapsed))",
  spans:      "hsl(var(--metric-spans))",
  increment:  "hsl(var(--metric-increment))",
  text:       "hsl(var(--metric-text))",
},
```

**Resolves issues:** #5, prerequisites for #1 #2 #4 #6

---

## Phase 2 — Fix metric color consistency (Rep and Action)

**Goal:** Make fragment pills, companion panels, and inline panels all use the same hue for the same metric.

### Strategy

`metricColorMap.ts` is the single source of truth for the mapping. Update it to use the new `metric-*` CSS variable utilities. Then align the companion panel and inline panel files to match.

### Changes

**`src/views/runtime/metricColorMap.ts`**

Replace hardcoded Tailwind classes with CSS-variable-backed utilities:

```ts
export const metricColorMap: Record<string, MetricColors> = {
  time:       { bg: "bg-metric-time/15",       border: "border-metric-time/40",       text: "text-metric-time" },
  rep:        { bg: "bg-metric-rep/15",        border: "border-metric-rep/40",        text: "text-metric-rep" },
  effort:     { bg: "bg-metric-effort/15",     border: "border-metric-effort/40",     text: "text-metric-effort" },
  rounds:     { bg: "bg-metric-rounds/15",     border: "border-metric-rounds/40",     text: "text-metric-rounds" },
  distance:   { bg: "bg-metric-distance/15",   border: "border-metric-distance/40",   text: "text-metric-distance" },
  resistance: { bg: "bg-metric-resistance/15", border: "border-metric-resistance/40", text: "text-metric-resistance" },
  action:     { bg: "bg-metric-action/15",     border: "border-metric-action/40",     text: "text-metric-action" },
  // ... remaining types
};
```

**`src/components/Editor/overlays/WodCompanion.tsx`**  
**`src/components/Editor/overlays/MetricInlinePanel.tsx`**

Replace per-type hardcoded classes with references to the same `metric-*` utilities.

**Resolves issues:** #2, #6

---

## Phase 3 — Fix runtime state color consistency (Executing = green everywhere)

**Goal:** "Executing/running" is always green. "Complete" is always a distinct color. Pick a consistent mapping and apply it across all runtime status surfaces.

### Proposed Semantic Mapping

| State | Chosen Color | Rationale |
|-------|-------------|-----------|
| executing / running | `--success` / green | Active, healthy, in-progress |
| complete | `--metric-time` / blue | Calm, finished, not alarming |
| paused | `--warning` / amber | Caution, interrupted |
| idle / pending | `--muted` / grey | Neutral, not started |
| error | `--destructive` / red | Failure |

### Changes

**`src/runtime/components/BlockTimerDisplay.tsx`**  
Change `text-primary` → `text-success` for running state.

**`src/components/workout/RuntimeDebugPanel.tsx`**  
Change `bg-blue-500` (running dot) → `bg-success` and `bg-green-500` (complete dot) → `bg-metric-time` (blue).

**`src/runtime-test-bench/components/StatusFooter.tsx`**  
Align footer text/bg classes with the table above, replacing raw Tailwind colors with semantic tokens.

**`src/runtime-test-bench/styles/tailwind-components.ts`**  
```ts
executing: "bg-success text-success-foreground",
completed: "bg-metric-time/20 text-metric-time",
paused:    "bg-warning text-warning-foreground",
```

**Resolves issues:** #3

---

## Phase 4 — Move editor token colors to CSS variables

**Goal:** The Monaco/CodeMirror extension files read metric colors from CSS variables at runtime, so they respond to theme changes and dark mode automatically.

### Strategy

Create a helper `getMetricColors()` that reads computed CSS variable values at runtime:

```ts
// src/components/Editor/extensions/metricTokenColors.ts
export function getMetricColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => `hsl(${style.getPropertyValue(name).trim()})`;
  return {
    time:       get('--metric-time'),
    rep:        get('--metric-rep'),
    effort:     get('--metric-effort'),
    rounds:     get('--metric-rounds'),
    distance:   get('--metric-distance'),
    resistance: get('--metric-resistance'),
    action:     get('--metric-action'),
  };
}
```

### Changes

**`src/components/Editor/extensions/cursor-focus-panel.ts`**  
Replace hardcoded hex values with `getMetricColors()` calls.

**`src/components/Editor/extensions/gutter-unified.ts`**  
Replace `#22c55e`, `#ef4444`, `#f59e0b`, `#3b82f6` with CSS variable reads for `--success`, `--destructive`, `--warning`, `--metric-time`.

**`src/components/Editor/extensions/wod-decorations.ts`**  
Replace `bg-blue-500/10` / `bg-yellow-500/5` with CSS-variable-backed values.

> **Note:** Monaco extensions re-apply decorations on each editor update, so calling `getComputedStyle` is cheap — values are cached per render cycle.

**Resolves issues:** #1

---

## Phase 5 — Timer warning/critical zones use semantic tokens

**Goal:** The timer progress bar threshold colors come from the design system, not hardcoded values.

### Changes

**`src/index.css`** — add threshold variables:

```css
--timer-warning-threshold: 0.7;   /* JS reads this to switch color */
--timer-critical-threshold: 0.9;
```

**`src/clock/components/DigitalClock.tsx`**

Replace the ternary color logic:

```tsx
// Before
const barColor = progress > 0.9 ? 'bg-red-500' : progress > 0.7 ? 'bg-yellow-500' : 'bg-primary';

// After
const barColor =
  progress > 0.9 ? 'bg-destructive' :
  progress > 0.7 ? 'bg-warning' :
  'bg-success';
```

Replace hardcoded button colors with semantic variants:
- Start / status-dot running → `bg-success`
- Pause → `bg-warning`
- Stop / error → `bg-destructive`
- Resume / info → `bg-primary`
- Reset → `bg-muted`

**Resolves issues:** #4

---

## Phase 6 — Pastel-tune the metric token values

**Goal:** With all metric colors flowing through CSS variables (Phases 1–5 complete), adjust the HSL values in `:root` to harmonize with the pastel design system without changing any component code.

### Approach

Adjust lightness (L) and saturation (S) of each `--metric-*` token to be perceptually consistent with the pastel primary (`158 38% 64%`):

- Target lightness: **55–65%** in light mode, **60–72%** in dark mode
- Target saturation: **35–50%** (down from current vivid 60–80%)
- Preserve hue identity so metrics remain distinguishable

This is a single-file change in `src/index.css` and is the final step to a fully cohesive pastel color system.

**Resolves issues:** #6 (fully)

---

## Summary

| Phase | Scope | Key Files | Issues Fixed |
|-------|-------|-----------|-------------|
| 1 | Add CSS token variables | `src/index.css`, `tailwind.config.cjs` | #5 |
| 2 | Fix metric color mapping consistency | `metricColorMap.ts`, overlays | #2, #6 (partial) |
| 3 | Fix runtime state color consistency | `BlockTimerDisplay`, `StatusFooter`, `tailwind-components.ts` | #3 |
| 4 | Move editor token hex to CSS variables | `cursor-focus-panel.ts`, `gutter-unified.ts`, `wod-decorations.ts` | #1 |
| 5 | Move timer thresholds to semantic tokens | `DigitalClock.tsx` | #4 |
| 6 | Tune metric tokens to pastel scale | `src/index.css` | #6 (fully) |

Phases 1–3 are safe UI-only changes with no logic risk.  
Phase 4 requires care around Monaco's decoration lifecycle.  
Phase 6 is purely aesthetic and can be iterated on independently.
