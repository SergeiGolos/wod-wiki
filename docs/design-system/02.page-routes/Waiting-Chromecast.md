# Page: Waiting — Chromecast Receiver

**Mode:** `waiting`
**Trigger:** No WebRTC connection established / Cast SDK not yet ready
**Component:** *(inline in `ReceiverApp` — no dedicated component)*
**Status:** Implemented
**Common infrastructure:** [chromecast-template.md](../01.page-templates/chromecast-template.md)

---

## Purpose

"No client connected" idle state. The receiver is alive and ready but has no sender session. Also displayed immediately after a sender disconnects, signalling readiness for a new session.

---

## Layout

```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│         [status text]                  │  ← absolute center
│         e.g. "WAITING FOR CAST"        │  ← font-mono text-white/20
│                                        │  ← uppercase tracking-[0.5em]
│                                        │
│                          [status] ─────│  ← absolute bottom-2 right-2
└────────────────────────────────────────┘
```

**Root:** `bg-black h-screen w-screen` — full bleed black canvas.

**Status text:** Centred with `absolute inset-0 flex items-center justify-center`. Typography: `font-mono text-white/20 uppercase tracking-[0.5em]`.

**Connection status badge:** `absolute bottom-2 right-2` — displays `waiting-for-cast` or `disconnected` depending on the last known connection state.

---

## Behaviour

- Rendered when `proxyRuntime === null`
- No interactive elements — this screen accepts no D-Pad or remote input
- Transition **out** occurs automatically when `ReceiverCastSignaling` receives a new `webrtc-offer` and `ChromecastProxyRuntime` is constructed
- Transition **in** occurs when the transport is disposed (sender disconnect or network drop)

---

## Transitions

| Event | Next mode |
|-------|-----------|
| WebRTC offer received → transport established | `preview` or `active` (depending on sender state) |

---

## Related

- [chromecast-template.md](../01.page-templates/chromecast-template.md) — connection lifecycle and provider architecture
- [Preview-Chromecast.md](Preview-Chromecast.md) — first screen after a sender connects
