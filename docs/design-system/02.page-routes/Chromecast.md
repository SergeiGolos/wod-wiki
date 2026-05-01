# Page: Chromecast Receiver

**Route:** *(separate entry point — no URL routing)*
**Template:** [FocusTemplate](../00.layout-template/focus-template.md) (conceptual parent — not via React Router)
**Layout:** Full-screen, no AppTemplate shell
**Status:** Implemented
**Source:** `playground/src/receiver-rpc.tsx`, `receiver-main.tsx`
**Reference:** [Chromecast Layout doc](../../chromecast-layout.md)

---

## Overview

The Chromecast Receiver is a **separate React application entry point** (`receiver-main.tsx` → `receiver-rpc.tsx`) that runs on a Cast-enabled TV display. It shares the design token and component library with the web app but has its own full-screen, no-router layout model.

Identity is not carried in a URL — instead the receiver is a **mode-driven state machine**. A single `workbenchState.mode` value selects one of four mutually-exclusive full-screen views. The `ChromecastProxyRuntime` bridges RPC messages from the connected browser sender into the same `IScriptRuntime` interface used by the web workbench, so all runtime hooks (`useSnapshotBlocks`, `useStackTimers`, etc.) work identically on the receiver without modification.

---

## Root Container

```
h-screen w-screen bg-background text-foreground overflow-hidden
```

Always fills the full display. `overflow-hidden` is intentional — nothing scrolls outside panel interiors.

---

## Mode / View State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     workbenchState.mode                         │
│                                                                 │
│  [waiting] ──── Cast SDK ready ────► [idle / active]            │
│                        ▲                   │                    │
│                        │            preview data arrives        │
│                        │                   ▼                    │
│                 client disconnects    [preview]                  │
│                        │                   │                    │
│                        │           user selects block           │
│                        │                   ▼                    │
│                        │             [active / idle]            │
│                        │                   │                    │
│                        │          workout completes             │
│                        │                   ▼                    │
│                        └──────────────[review]                  │
└─────────────────────────────────────────────────────────────────┘
```

| Mode | Trigger | Screen |
|------|---------|--------|
| `waiting` | No WebRTC connection / SDK not yet ready | **Notification Screen** |
| `preview` | `previewData` received from sender | **Select Block Screen** |
| `active` / `idle` | Runtime connected and running | **Runtime View** |
| `review` | `reviewData` received on workout completion | **Results View** |

---

## View 1 — Notification Screen (`waiting`)

**Purpose:** "No client connected" idle state. Shows the receiver is alive and ready.

```
┌────────────────────────────────────────┐
│                                        │
│         [status text]                  │  ← centered
│         e.g. "WAITING FOR CAST"        │  ← font-mono text-white/20
│                                        │  ← uppercase tracking-[0.5em]
│         bg-black                       │
└────────────────────────────────────────┘
```

**Behaviour:**
- Shown when `proxyRuntime === null` (no WebRTC connection established)
- Displayed after disconnect — the receiver immediately returns here when the sender drops the connection, signalling readiness for a new session
- Connection status badge (`absolute bottom-2 right-2`) shows `waiting-for-cast` or `disconnected`

---

## View 2 — Select Block Screen (`preview`)

**Purpose:** A note is in context on the sender, but no block has been started. Allows the user to select which workout block to run using a remote control or on-screen tap.

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverPreviewPanel                 │
│   ┌──────────────────────────────┐     │
│   │ • Block A  (focusable)       │     │  ← D-Pad navigable
│   │ • Block B  (focusable)       │     │  ← spatial nav IDs: preview-block-0, -1…
│   │ • Block C  (focusable)       │     │
│   └──────────────────────────────┘     │
│                       [status] ← abs   │
└────────────────────────────────────────┘
```

**Behaviour:**
- `useSpatialNavigation` initialises with `initialFocusId: 'preview-block-0'`
- Selecting any `preview-block-*` element dispatches `sendEvent('next')` → RPC to browser → browser starts the workout
- This is the **remote-control entry point** for launching a workout: the user on the couch uses the TV remote D-Pad to select and start
- The browser sender receives the `next` event and transitions the runtime — the receiver follows via the `workbenchState` subscription

---

## View 3 — Runtime View (`active` / `idle`)

**Purpose:** Live workout execution display. Mirrors the browser workbench layout adapted for TV form factor.

```
┌───────────────────────┬────────────────────────────┐
│  Left Column          │  Right Column              │
│  flex-1               │  w-1/2                     │
│  bg-secondary/10      │  bg-background             │
│                       │                            │
│  ReceiverStackPanel   │  MetricTrackerCard         │  ← p-4 pt-6
│  (stack + history)    │  (live metrics)            │
│                       │                            │
│                       │  ReceiverTimerPanel        │  ← flex-1 justify-center
│                       │  (timers + controls)       │
│                       │                            │
│                       │             [status] ← abs │
└───────────────────────┴────────────────────────────┘
```

**Left column** (`flex-1 min-w-0`): `ReceiverStackPanel` — runtime stack tree, interleaved completion history, "Up Next" preview. Internal scroll.

**Right column** (`w-1/2 flex flex-col`): `MetricTrackerCard` (live metric row) + `ReceiverTimerPanel` (primary timer display, play/pause/next controls).

### Remote Control — Runtime View

| D-Pad action | Target (`id`) | Behaviour sent to browser |
|--------------|---------------|---------------------------|
| Select `timer-main` | Primary timer display | Toggles play/pause via `.click()` |
| Select `btn-next` | Next button | Sends `next` event → RPC → browser |
| Select `btn-stop` | Stop button | Sends `stop` event → RPC → browser |
| Any select | — | Audio `click` feedback + `dpadFlash` overlay |

**D-Pad flash:** On every remote activation a `fixed inset-0 z-50 bg-primary/10` overlay flashes briefly (~200ms) as visual confirmation.

---

## View 4 — Results View (`review`)

**Purpose:** Post-workout analytics. Shown automatically after workout completion.

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverReviewPanel                  │
│   (full bleed results + analytics)     │
│                                        │
│                       [status] ← abs   │
└────────────────────────────────────────┘
```

**Behaviour:**
- Rendered when `workbenchState.reviewData` is available
- No close button on the receiver — the **sender must navigate away** (e.g. user leaves the review page on the phone/browser)
- When sender disconnects, receiver returns to **Notification Screen** (`waiting`)

---

## Remote Control — Full Summary

The receiver is controlled entirely from the sender browser (via RPC) or from the TV remote (via D-Pad spatial navigation). Both paths converge on the same `sendEvent()` function.

| Input source | Mechanism | Events |
|-------------|-----------|--------|
| TV remote D-Pad | `useSpatialNavigation` → `sendEvent()` | `next`, `stop`, play/pause |
| Browser sender | `proxyRuntime.handle()` directly | Any runtime event |
| On-screen tap | Global click listener → `audioService` | Audio feedback only (no RPC) |

---

## Provider Architecture

```
ReceiverApp
 └── ScriptRuntimeProvider (runtime = ChromecastProxyRuntime)
      └── PanelSizeProvider
           └── [mode-driven screen component]
```

- `ChromecastProxyRuntime` translates WebRTC RPC messages into the `IScriptRuntime` interface — workbench hooks work identically to the browser
- `PanelSizeProvider` allows panels to adapt to container dimensions
- No React Router — mode state is owned by `ReceiverApp`

---

## Clock Synchronisation

- Local `now` updated via `requestAnimationFrame`
- `ChromecastProxyRuntime.getSenderClockTimeMs()` adjusts for WebRTC clock drift
- `window.__chromecast_senderClockTimeMs` published globally for hook access without prop-drilling
- Ensures timer elapsed-time display stays in sync with the sender's runtime clock

---

## Differences from Web App

| Concern | Web App | Chromecast Receiver |
|---------|---------|---------------------|
| Routing | React Router (URL) | State machine (`workbenchState.mode`) |
| Layout shell | AppTemplate / FocusTemplate | Bare `h-screen w-screen overflow-hidden` |
| Navigation | URL + history | None |
| Sidebar | Yes | None |
| Scrolling | Document scroll | `overflow-hidden` — no scroll |
| Runtime source | Local `ScriptRuntime` | `ChromecastProxyRuntime` (RPC proxy) |
| Input | Mouse / keyboard | TV remote D-Pad + on-screen tap |

---

## Connection Lifecycle

1. `castContext.start()` registers the custom namespace
2. `ReceiverCastSignaling` listens for `webrtc-offer` signals
3. Each new `webrtc-offer` triggers `setupTransport()` — disposes any previous session first (reconnection support)
4. `WebRtcRpcTransport` connects as `answerer`
5. `ChromecastProxyRuntime` wraps the transport
6. On disconnect → transport and runtime disposed → receiver returns to **Notification Screen**

The signaling instance (`ReceiverCastSignaling`) is owned by `ReceiverApp` and **never** disposed, enabling reconnection without a page reload.
