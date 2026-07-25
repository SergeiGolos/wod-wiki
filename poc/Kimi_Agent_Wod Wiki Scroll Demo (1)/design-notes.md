# Design Synthesis — wod.wiki walkthrough prototype

## Layout mechanics (from pinned/sticky product storytelling references)
- Walkthrough = two-column section on desktop: LEFT = scrolling step cards
  (one per layer: Editor / Timer / Analytics), each min-height ~90vh so scroll
  pace feels deliberate. RIGHT = sticky mock app window (browser chrome with
  traffic-light dots) that stays in view.
- As each step crosses the viewport middle (IntersectionObserver, rootMargin
  -45%), the corresponding region of the mock window lights up: accent outline
  ring + everything else dimmed (overlay), with a soft 300ms ease transition.
- Vertical progress rail on the far left of the steps column: three tick lines
  that fill with the active layer's accent color as scroll progresses.
- Mobile fallback: single column, mock window becomes a stacked card per step.

## Color (from references, not invented)
- Page: off-white #FAFAFA, near-black text #0A0A0A, muted 40% black secondary.
- Signature accent orange #F63A22 → EDITOR layer.
- Green (dark-mode #22F677 → light-mode workhorse #16A34A) → TIMER layer.
- Electric violet #5541EA → ANALYTICS layer.
- Mock window interior: near-black #171612 dark canvas with light text — makes
  the product UI pop against the light page, timer digits glow.

## Typography
- UI/body: Inter. Technical labels, step numbers, code, timer digits: Geist Mono
  / ui-monospace. Display headings: Inter tight tracking (-0.03em), uppercase
  mono kickers with 0.2em letter-spacing.

## Micro-interactions (borrowed craft)
- Timer digits in the mock actually tick when the Timer step is active
  (JS interval) — the walkthrough demonstrates, not just describes.
- Highlight ring animates via CSS transition on a single absolutely-positioned
  overlay; dim via sibling mask layer.
- Copy tone: short, imperative, dev-tool voice ("Write the workout.",
  "Run the clock.", "Read the results.").

## Content anchors (verified from wod.wiki)
- Product: interactive scratchpad for whiteboard-script, plain-text fitness
  scripting language. No account needed.
- Real syntax to feature in the mock editor:
    (3)
      10 Kettlebell Swings 24kg
      *:30 Rest
  plus AMRAP 20:00, 2:00 Row, 21,15,9 Thrusters, ## Warm-up section labels.
