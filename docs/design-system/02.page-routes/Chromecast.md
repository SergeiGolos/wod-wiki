# Chromecast Receiver — Common Infrastructure

**Entry point:** `playground/src/receiver-main.tsx` → `receiver-rpc.tsx`
**Template:** [FocusTemplate](../00.layout-template/focus-template.md) (conceptual parent — not via React Router)
**Layout:** Full-screen, no AppTemplate shell
**Status:** Implemented
**Reference:** [Chromecast Layout doc](../../chromecast-layout.md)

---

## Overview

The Chromecast Receiver is a **separate React application** that runs on a Cast-enabled TV display. It shares the design token and component library with the web app but has its own full-screen, no-router layout model.

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

| Mode | Trigger | Page |
|------|---------|------|
| `waiting` | No WebRTC connection / SDK not yet ready | [Waiting-Chromecast](Waiting-Chromecast.md) |
| `preview` | `previewData` received from sender | [Preview-Chromecast](Preview-Chromecast.md) |
| `active` / `idle` | Runtime connected and running | [Runtime-Chromecast](Runtime-Chromecast.md) |
| `review` | `reviewData` received on workout completion | [Review-Chromecast](Review-Chromecast.md) |

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

## Connection Lifecycle

1. `castContext.start()` registers the custom namespace
2. `ReceiverCastSignaling` listens for `webrtc-offer` signals
3. Each new `webrtc-offer` triggers `setupTransport()` — disposes any previous session first (reconnection support)
4. `WebRtcRpcTransport` connects as `answerer`
5. `ChromecastProxyRuntime` wraps the transport
6. On disconnect → transport and runtime disposed → receiver returns to [Waiting-Chromecast](Waiting-Chromecast.md)

The signaling instance (`ReceiverCastSignaling`) is owned by `ReceiverApp` and **never** disposed, enabling reconnection without a page reload.

---

## Clock Synchronisation

- Local `now` updated via `requestAnimationFrame`
- `ChromecastProxyRuntime.getSenderClockTimeMs()` adjusts for WebRTC clock drift
- `window.__chromecast_senderClockTimeMs` published globally for hook access without prop-drilling
- Ensures timer elapsed-time display stays in sync with the sender's runtime clock

---

## Remote Control — Input Model

The receiver is controlled entirely from the sender browser (via RPC) or from the TV remote (via D-Pad spatial navigation). Both paths converge on the same `sendEvent()` function.

| Input source | Mechanism | Events |
|-------------|-----------|--------|
| TV remote D-Pad | `useSpatialNavigation` → `sendEvent()` | `next`, `stop`, play/pause |
| Browser sender | `proxyRuntime.handle()` directly | Any runtime event |
| On-screen tap | Global click listener → `audioService` | Audio feedback only (no RPC) |

**D-Pad flash:** On every remote activation a `fixed inset-0 z-50 bg-primary/10` overlay flashes briefly (~200ms) as visual confirmation. This applies across all views that accept D-Pad input.

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
