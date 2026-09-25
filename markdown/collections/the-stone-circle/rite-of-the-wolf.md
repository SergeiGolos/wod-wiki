---
tags:
  - strength
  - conditioning
  - minimalist
---

# Rite of the Wolf

**Category**: The Stone Circle  
**Type**: Power Endurance / Progressive EMOM  
**Difficulty**: Advanced

## Description

The Rite of the Wolf is the heart of the Stone Circle: a grueling 30-minute power-endurance session performed with a bodyweight-level sandbag. The work is controlled explosive throwing — the bag travels ground → lap → chest, then back down — never slow, never grinded. Slow-moving repetitions are not permitted.

Progression is density-based. You do not add weight to advance; you compress time. Every rung on the ladder below is a full 30-minute session built from six 5-minute blocks, and each rung tightens the intervals or stacks reps until you arrive at the summit: one explosive rep every 20 seconds, for 30 minutes straight — 90 total reps.

Two movement variants are used, distinguished by sandbag orientation:

- **Bear Hug Extension** — bag held vertically, hugged to the chest
- **Horizontal Extension** — bag held horizontally across the chest

The scripts below prescribe the Bear Hug Extension; substitute or alternate the Horizontal Extension freely. The `?lb` prompt logs your bag weight each session — track it against the rank standards at the bottom of this file.

## Whiteboard Script

### Level 1 — Intervals: 60s → 30s

Each rung converts one more 60s interval into two 30s intervals, inside every 5-minute block.

#### 1.0 — Level 1 Baseline (30 reps)
```time
(30) :60 EMOM
  1 Sandbag Bear Hug Extension ?lb
```

#### 1.1 — One Pair Converted (36 reps)
```time
(6)
  (4) :60 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (2) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 1.2 — Two Pairs Converted (42 reps)
```time
(6)
  (3) :60 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (4) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 1.3 — Three Pairs Converted (48 reps)
```time
(6)
  (2) :60 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (6) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 1.4 — Four Pairs Converted (54 reps)
```time
(6)
  (1) :60 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (8) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 1.5 — Full Transition (60 reps)
```time
(60) :30 EMOM
  1 Sandbag Bear Hug Extension ?lb
```
*1.5 reaches Level 2 density — this is the graduation rung into Level 2.*

### Level 2 — Intervals: 30s → 20s

Each rung trades 30s windows for 20s windows inside every 5-minute block.

#### 2.0 — Level 2 Baseline (60 reps)
```time
(60) :30 EMOM
  1 Sandbag Bear Hug Extension ?lb
```

#### 2.1 — Three 20s Windows (66 reps)
```time
(6)
  (8) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (3) :20 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 2.2 — Six 20s Windows (72 reps)
```time
(6)
  (6) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (6) :20 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 2.3 — Nine 20s Windows (78 reps)
```time
(6)
  (4) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (9) :20 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 2.4 — Twelve 20s Windows (84 reps)
```time
(6)
  (2) :30 EMOM
    1 Sandbag Bear Hug Extension ?lb
  (12) :20 EMOM
    1 Sandbag Bear Hug Extension ?lb
```

#### 2.5 — Full Transition (90 reps)
```time
(90) :20 EMOM
  1 Sandbag Bear Hug Extension ?lb
```
*2.5 reaches Level 3 density — the final preparation rung.*

### Level 3 — The Test

#### 3 — Level 3 (90 reps in 30 minutes)
```time
(90) :20 EMOM
  1 Sandbag Bear Hug Extension ?lb
```
*The rank test. Performed at your target rank-standard load. Every rep must remain an explosive throw — a rep that leaves your hands slowly does not count.*

## How to Train It

### The Movement

1. **Setup**: Bag on the ground in front of you, feet hip-width, hinged at the hips.
2. **Lap**: Explode the bag from the ground onto your lap, seated or half-kneeling posture, arms wrapped.
3. **Chest**: From the lap, drive the hips and pull the bag up to the chest — bear hug or horizontal cradle.
4. **Return**: Set the bag back down under control and reset your stance. The *throw up* is explosive; the reset is brisk but not lazy — the clock is running.
5. **Breathe**: Sharp exhale on the throw. Reset your brace during the remaining window.

### Progression Rules

- Hold each rung until you complete all 30 minutes with crisp, explosive reps in every segment — including the fast segment at the end of each block.
- Typical cadence: one rung per week, training the Wolf 1–2 times per week alongside the program's other 30-minute sessions.
- When a rung's fast segments feel controlled, take the next rung. When you own 2.5, you are ready to test Level 3.
- Load stays fixed while density climbs. Move up a rank-standard load only after owning Level 3 at the current load.

### Rank Standards (Tested at Level 3)

| Rank | Bag Weight |
|---|---|
| Initiate | Bodyweight − 50 lb |
| Fighter | Bodyweight − 25 lb |
| Berserker | Bodyweight |
| Warlord | Bodyweight + 25 lb |

## Safety Considerations

The Wolf is a maximal-effort hip-extension throw repeated under accumulating fatigue — the lower back, biceps, and grip take the brunt. If your lower back starts rounding on the ground-to-lap pull, end the session; a slow, ugly rep is worse than a missed window. Keep the landing area clear and the bag away from concrete if possible. The 20s rungs leave almost no rest — treat nausea, dizziness, or form collapse as the session's end, not something to push through.

## Collectible Metrics

- **Total reps**: 30 → 90 across the ladder; log per session
- **Bag weight**: Via the `?lb` prompt — track against the rank standards
- **Segment quality**: Whether the final fast segment of each block stayed explosive
- **Current rung**: The level.variant you can complete for all 30 minutes
- **Level 3 test result**: Time, load, and rank achieved
