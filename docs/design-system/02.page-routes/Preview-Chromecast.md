# Page: Preview — Chromecast Receiver

**Mode:** `preview`
**Trigger:** `previewData` received from the browser sender
**Component:** `ReceiverPreviewPanel`
**Common infrastructure:** [chromecast-template.md](../01.page-templates/chromecast-template.md)

---

## Purpose

A note is loaded on the sender but no workout block has been started yet. This screen lets the user select which block to run from the TV remote — the D-Pad is the primary input device here.

---

## Layout

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverPreviewPanel                 │
│   ┌──────────────────────────────┐     │
│   │ • Block A  (focusable)       │     │  ← D-Pad navigable
│   │ • Block B  (focusable)       │     │  ← spatial nav IDs: preview-block-0, -1…
│   │ • Block C  (focusable)       │     │
│   └──────────────────────────────┘     │
│                                        │
│                          [status] ─────│  ← absolute bottom-2 right-2
└────────────────────────────────────────┘
```

**Root:** Full-screen, inherits `h-screen w-screen overflow-hidden` from `ReceiverApp`.

**Block list:** Each selectable item has a spatial nav ID of `preview-block-{n}` (zero-indexed). The list is D-Pad navigable via `useSpatialNavigation`.

**Connection status badge:** `absolute bottom-2 right-2`.

---

## Behaviour

- `useSpatialNavigation` initialises with `initialFocusId: 'preview-block-0'` — focus lands on the first block automatically
- Selecting any `preview-block-*` item dispatches `sendEvent('next')` → RPC to browser sender → browser starts the workout runtime
- The receiver does **not** start the runtime itself — it follows the sender's state via the `workbenchState` subscription
- This is the **remote-control launch point**: user on the couch uses the TV remote D-Pad to select and start a workout block

---

## Remote Control

| D-Pad action | Target | Result |
|-------------|--------|--------|
| Up / Down | `preview-block-*` items | Moves focus between blocks |
| Select | Focused `preview-block-*` | Sends `next` → RPC → browser starts workout |

Audio `click` feedback plays on each D-Pad selection (via `audioService`). [D-Pad flash](../01.page-templates/chromecast-template.md#remote-control--input-model) overlay fires on Select.

---

## Transitions

| Event | Next mode |
|-------|-----------|
| User selects a block (D-Pad Select) | `active` / `idle` — sender starts runtime, receiver follows |
| Sender disconnects | `waiting` |

---

## Related

- [chromecast-template.md](../01.page-templates/chromecast-template.md) — remote control input model
- [Waiting-Chromecast.md](Waiting-Chromecast.md) — screen shown before sender connects
- [Runtime-Chromecast.md](Runtime-Chromecast.md) — screen shown after a block is selected
