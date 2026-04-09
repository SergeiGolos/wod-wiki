# Chromecast Receiver — Layout Template

The Chromecast receiver (`playground/src/receiver-rpc.tsx`) is a **separate React entry point** (`receiver-main.tsx` → `receiver-rpc.tsx`) that runs on a Cast-enabled display. It shares the core design tokens and component library with the web app but has its own layout model: full-screen, no sidebar, no URL routing, no scroll.

---

## 1. Entry Point & Providers

```
ReceiverApp
 └── ScriptRuntimeProvider (runtime = ChromecastProxyRuntime)
      └── PanelSizeProvider
           └── [mode-driven screen]
```

- `ChromecastProxyRuntime` hydrates RPC messages from the sender into the same stack snapshot + output statement APIs that the browser workbench uses.
- `PanelSizeProvider` allows panels to adapt to container dimensions.
- No router — mode is driven by `workbenchState.mode` state.

---

## 2. Root Container

```css
h-screen w-screen bg-background text-foreground overflow-hidden
```

- Always fills the full display — no margin, no padding, no scrollbars.
- `overflow-hidden` is intentional: nothing should scroll outside of panel interiors.

---

## 3. Mode-Driven Layout

The receiver renders one of **four mutually-exclusive full-screen layouts** based on `workbenchState.mode`:

| Mode | Trigger | Layout |
|------|---------|--------|
| `waiting` | No WebRTC connection | Centered status message |
| `preview` | `previewData` available | Full-screen preview list |
| `review` | `reviewData` available | Full-screen results screen |
| `active` / `idle` | Runtime connected | Two-column workout view |

### 3.1 Waiting Screen

```
┌────────────────────────────────────────┐
│                                        │
│         [status text]                  │  ← centered, font-mono, text-white/20
│                                        │
│         bg-black                       │
└────────────────────────────────────────┘
```

```css
h-screen w-screen bg-black flex flex-col items-center justify-center
text-white/20 font-mono uppercase tracking-[0.5em]
```

### 3.2 Preview Screen

Full-screen workout preview (exercise list before starting).

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverPreviewPanel                 │  ← full bleed, spatially focused
│   (selectable blocks, D-Pad nav)       │
│                                        │
│                       [status] ← abs   │
└────────────────────────────────────────┘
```

```css
h-screen w-screen bg-background text-foreground overflow-hidden
/* status badge */
absolute bottom-2 right-2 opacity-10 text-[8px] font-mono uppercase tracking-tighter
```

Spatial navigation: initial focus `preview-block-0`. Selecting any block dispatches `next` event to start the workout.

### 3.3 Review Screen

Full-screen post-workout results.

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverReviewPanel                  │  ← full bleed results + analytics
│                                        │
│                       [status] ← abs   │
└────────────────────────────────────────┘
```

Same outer container as Preview. No close button — the sender must navigate away.

### 3.4 Active / Idle Screen (Two-Column)

The primary workout display. Mirrors the browser workbench layout adapted for a TV/display form factor.

```
┌───────────────────────┬────────────────────────────┐
│  Left Column (flex-1) │  Right Column (w-1/2)      │
│  bg-secondary/10      │  bg-background              │
│  border-r border      │                             │
│                       │  ┌──────────────────────┐  │
│  ReceiverStackPanel   │  │  MetricTrackerCard   │  │  ← p-4 pt-6
│  (stack + history)    │  │  (p-4 pt-6)          │  │
│                       │  └──────────────────────┘  │
│                       │  ReceiverTimerPanel         │  ← flex-1 flex flex-col justify-center
│                       │  (primary + secondary       │
│                       │   timers + controls)        │
│                       │                             │
│                       │              [status] ← abs │
└───────────────────────┴────────────────────────────┘
```

**Left column** (`flex-1 min-w-0`):
- `ReceiverStackPanel` — runtime stack (root→leaf), interleaved completion history, "Up Next" preview.
- Internal scroll: `h-full overflow-y-auto`.
- Background: `bg-slate-50/50 dark:bg-slate-900/50`.

**Right column** (`w-1/2 flex flex-col`):
- `MetricTrackerCard` — live metric row (reps, distance, load).
- `ReceiverTimerPanel` — primary timer (large display) + secondary timers + play/pause/next controls.
- Timer panel grows to fill remaining vertical space: `flex-1 flex flex-col justify-center`.

---

## 4. Panel Components

| Component | File | Slot | Responsibility |
|-----------|------|------|----------------|
| `ReceiverTimerPanel` | `src/panels/timer-panel-chromecast.tsx` | Right column — lower | Primary + secondary timers, transport controls |
| `ReceiverStackPanel` | `src/panels/track-panel-chromecast.tsx` | Left column | Stack tree, completion summaries, Up Next |
| `ReceiverPreviewPanel` | `src/panels/preview-panel-chromecast.tsx` | Full-screen (preview mode) | Pre-workout exercise list |
| `ReceiverReviewPanel` | `src/panels/review-panel-chromecast.tsx` | Full-screen (review mode) | Post-workout results + analytics |
| `MetricTrackerCard` | `src/components/track/MetricTrackerCard.tsx` | Right column — upper | Live metric values |

All panels consume runtime state via the same hooks as the browser workbench (`useSnapshotBlocks`, `useStackTimers`, `useOutputStatements`, etc.) — the `ChromecastProxyRuntime` makes this transparent.

---

## 5. D-Pad / Spatial Navigation

The `useSpatialNavigation` hook drives remote-control interaction:

| D-Pad action | Target element ID | Behaviour |
|--------------|-------------------|-----------|
| Select on `preview-block-*` | preview items | Sends `next` event (start workout) |
| Select on `timer-main` | primary timer display | Toggles play/pause via `.click()` |
| Select on `btn-next` | next button | Sends `next` event |
| Select on `btn-stop` | stop button | Sends `stop` event |

A brief `bg-primary/10` flash overlay (`fixed inset-0 z-50`) is shown on every D-Pad activation for visual feedback.

---

## 6. Clock Synchronisation

The receiver maintains a `localNow` timestamp updated via `requestAnimationFrame`. The `ChromecastProxyRuntime` exposes `getSenderClockTimeMs()` which adjusts for WebRTC clock drift. `localNow` is passed as a prop to `ReceiverTimerPanel` and `ReceiverStackPanel` so elapsed time calculations stay in sync with the sender.

A global `window.__chromecast_senderClockTimeMs` function is also published so that hooks inside the runtime context can access sender-aligned time without prop-drilling.

---

## 7. Connection Status Badge

All four screens display a micro status badge:

```css
absolute bottom-2 right-2
opacity-10 text-[8px] font-mono tracking-tighter uppercase
```

Values: `waiting-for-cast`, `connecting`, `connected`, `disconnected`.

Intentionally near-invisible — for developer debugging only.

---

## 8. Audio Feedback

`audioService.playSound('click', 0.5)` is triggered on:
- Every D-Pad remote activation (via `useSpatialNavigation.onSelect`)
- Every on-screen button click (via a global `window` click listener)

This provides tactile-equivalent feedback for TV remote interaction.

---

## 9. Differences from Web App Layout

| Concern | Web App | Chromecast Receiver |
|---------|---------|---------------------|
| Scrolling | Document scroll (`window.scrollY`) | None — `overflow-hidden` on root |
| Navigation | URL routing (React Router) | State machine (`workbenchState.mode`) |
| Sidebar | `w-64` fixed left panel | None |
| Sticky header | Yes (page shell, z-30) | None |
| TOC sidebar | Yes (3xl+, w-80) | None |
| Breakpoints | Mobile / lg / 3xl | Full-screen only |
| Input | Mouse + keyboard | D-Pad + Cast remote |
| Clock source | `Date.now()` | `ChromecastProxyRuntime.getSenderClockTimeMs()` |
| Runtime source | Live `ScriptRuntime` | `ChromecastProxyRuntime` (RPC proxy) |
