# WOD Wiki — Runtime Clock Design System

## Brand
WOD Wiki executes workout scripts like a runtime executes code. During a live workout, the runtime clock view shows what is happening NOW (the active effort + clock), what comes UP NEXT (pending segments), and what is ALREADY HANDLED (completed outputs with logged splits).

## Personality
Athletic instrument panel: calm, technical, precise. Not gaming-neon, not dashboard-soup. Huge confident numerals, quiet everything else. Generous negative space; density only where it earns it.

## Color palette
### Light "Mineral" theme (default)
- Page background: #FAFBFC. Cards/surfaces: #FFFFFF. Tinted surface: #D6E4F0 (brand light).
- Brand slate blue (primary + time accent): #5980A8. Deep text variant: #3D5C7A.
- Ink foreground: #1A2027. Secondary text: #5A6672. Hairline borders: #E2E8EE.
- Metric accent coding (used only to color-code metric types, never decoratively):
  - Time — slate blue #5980A8
  - Reps — raw sienna #A87040
  - Effort / movement — moss green #508860
  - Rounds — slate violet #7C62A0
  - Distance — deep teal #408888
  - Resistance / load — terracotta #A05858
  - Warning / cap urgency — amber #B08340. Destructive — #C0392B.

### Dark "Arctic Night" theme (TV only)
- Background: #0E141B. Surface: #16202B. Elevated surface: #1C2836.
- Clock digits: frost blue #81A1C1. Aurora green #A3BE8C, aurora orange #D08770, frost teal #8FBCBB, aurora red #BF616A, aurora purple #B48EAD.
- Text: #E6EDF3. Secondary text: #8A98A6. Borders: #263340.

## Typography
- UI: Inter. All numerals/clocks: JetBrains Mono, tabular figures.
- Clock digits: massive (TV: ~180-260px; desktop hero: ~120-160px; mobile: ~64-88px), weight 600–700, tight tracking (-0.08em to -0.04em).
- Section labels ("UP NEXT", "COMPLETED", "ROUND"): 11–12px uppercase Inter semibold, +0.065em tracking, secondary color.
- Movement names: Inter 500, 16–20px. Prescriptions ("15 × 95 lb", "400 m"): JetBrains Mono 14–16px in their metric accent color.

## Shape & elevation
- Signature pill radius (9999px) for chips, labels, control buttons.
- Cards 16px; featured hero cards 24px.
- Flat-to-soft: 1px hairline borders + very soft shadows. No glassmorphism, no glow gradients, no mesh gradients.
- TV: high contrast, generous 24px+ padding, oversized type, no sub-2px hairlines.

## Iconography
Lucide-style, 1.5px stroke: Play, Pause, SkipForward, Square, Check, Timer, ChevronRight.

## Data display rules
- Time always JetBrains Mono. Countdown in time-blue; overtime "+" values in terracotta red.
- ALREADY HANDLED entries: green check, movement name at full opacity, logged split as a muted mono chip ("4:38").
- UP NEXT entries: movement name + prescription, ~70% opacity; the very next segment is emphasized at full opacity with a small "NEXT" pill in brand blue.
- Round progress as violet chips: "Round 3 of 5" or "Minute 2 of 10".
- Controls: pill buttons — Pause (primary), Skip/Next (secondary), Stop (destructive, quiet).
