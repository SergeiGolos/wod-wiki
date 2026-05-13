# Page: Review — Chromecast Receiver

**Mode:** `review`
**Trigger:** `reviewData` received from sender on workout completion
**Component:** `ReceiverReviewPanel`
**Status:** Implemented
**Common infrastructure:** [chromecast-template.md](../01.page-templates/chromecast-template.md)

---

## Purpose

Post-workout analytics screen. Displayed automatically when the workout finishes — no user action required to enter this state. Shows results and performance data full-bleed on the TV.

---

## Layout

```
┌────────────────────────────────────────┐
│                                        │
│   ReceiverReviewPanel                  │
│   (full bleed results + analytics)     │
│                                        │
│                                        │
│                          [status] ─────│  ← absolute bottom-2 right-2
└────────────────────────────────────────┘
```

**Root:** Full-screen, inherits `h-screen w-screen overflow-hidden` from `ReceiverApp`.

**Content:** `ReceiverReviewPanel` fills the entire viewport with workout results and analytics data sourced from `workbenchState.reviewData`.

**Connection status badge:** `absolute bottom-2 right-2`.

---

## Behaviour

- Rendered when `workbenchState.reviewData` is non-null
- **No dismiss or close button on the receiver** — the sender must navigate away (e.g. user leaves the review page on the phone/browser)
- When the sender disconnects, the receiver returns to [Waiting-Chromecast](Waiting-Chromecast.md) regardless of whether review data is still present
- No D-Pad interaction defined for this screen — it is a passive read-only display

---

## Transitions

| Event | Next mode |
|-------|-----------|
| Sender disconnects | `waiting` |
| Sender navigates away / clears review state | `preview` or `waiting` (depending on sender state) |

---

## Related

- [chromecast-template.md](../01.page-templates/chromecast-template.md) — common infrastructure and connection lifecycle
- [Runtime-Chromecast.md](Runtime-Chromecast.md) — screen shown during workout execution
- [Waiting-Chromecast.md](Waiting-Chromecast.md) — screen returned to after sender disconnect
