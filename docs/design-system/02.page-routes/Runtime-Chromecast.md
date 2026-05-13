# Page: Runtime — Chromecast Receiver

**Mode:** `active` / `idle`
**Trigger:** Runtime connected and a workout block is running (or paused)
**Components:** `ReceiverStackPanel`, `MetricTrackerCard`, `ReceiverTimerPanel`
**Status:** Implemented
**Common infrastructure:** [chromecast-template.md](../01.page-templates/chromecast-template.md)

---

## Purpose

Live workout execution display. Mirrors the browser workbench layout adapted for the TV form factor — wide two-column split with the runtime stack on the left and the active timer + metrics on the right.

---

## Layout

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

### Left Column (`flex-1 min-w-0`)

`ReceiverStackPanel` — displays the runtime stack tree, interleaved completion history, and an "Up Next" preview. Supports internal scroll within the column; the column itself does not scroll the page.

### Right Column (`w-1/2 flex flex-col`)

Two stacked sections:

| Section | Component | Layout |
|---------|-----------|--------|
| Metrics row | `MetricTrackerCard` | `p-4 pt-6` — fixed height at top |
| Timer + controls | `ReceiverTimerPanel` | `flex-1 justify-center` — fills remaining height |

**Connection status badge:** `absolute bottom-2 right-2`.

---

## Behaviour

- All runtime hooks (`useSnapshotBlocks`, `useStackTimers`, etc.) receive data from `ChromecastProxyRuntime` — identical to the browser workbench, no receiver-specific plumbing needed in components
- `active` and `idle` are treated as the same visual state — both show this screen; only the play/pause indicator in `ReceiverTimerPanel` differs
- Clock display uses `ChromecastProxyRuntime.getSenderClockTimeMs()` to stay in sync with the sender (see [Clock Synchronisation](../01.page-templates/chromecast-template.md#clock-synchronisation))

---

## Remote Control

| D-Pad action | Target (`id`) | Behaviour |
|-------------|---------------|-----------|
| Select | `timer-main` | Toggles play/pause via `.click()` on the element |
| Select | `btn-next` | Sends `next` event → RPC → browser advances workout |
| Select | `btn-stop` | Sends `stop` event → RPC → browser stops workout |
| Any select | — | Audio `click` feedback + [D-Pad flash](../01.page-templates/chromecast-template.md#remote-control--input-model) overlay |

---

## Transitions

| Event | Next mode |
|-------|-----------|
| Workout completes | `review` — `reviewData` published by sender |
| Sender disconnects | `waiting` |

---

## Related

- [chromecast-template.md](../01.page-templates/chromecast-template.md) — provider architecture, clock sync, remote control model
- [Preview-Chromecast.md](Preview-Chromecast.md) — screen shown before a block is selected
- [Review-Chromecast.md](Review-Chromecast.md) — screen shown after workout completion
