# 🎯 Home Page Workout Scripts Alignment

> **Purpose:** View and edit all home page workout scripts in one single place to align naming, movement types, reps, loads, and formatting across the home experience.

---

## ⚡ Quick Checklist

- [x] **Hero Main Script** simplified to quick-run 3s countdown & 10 pushups
- [x] **Hero Presets (4)** simplified to 1–2 specific mechanics per preset
- [x] **Chapter Runway Scripts (6)** updated with Rock Climbing dialect & Swimming complex workout
- [x] **Landing Page Snippets (4)** matching streamlined syntax rules

---

## 1. 🚀 Hero Main Script (Default Editor Load)

* **Source File:** `markdown/canvas/home/welcome-1.md`
* **Used by:** `playground/src/tour/HomeTour.tsx` (`HOME_DEMO_SOURCE`) & `markdown/canvas/home/README.md`
* **Alignment Note:** Simplified so the user can quickly run it, observe timer execution, and reach the results grid in seconds.

```time
// Click Next to advance
0:03 Countdown
10 Pushups
```

---

## 2. 🔀 Hero Preset Scripts (Dropdown Choices)

* **Source File:** `playground/src/tour/TourCaptions.tsx` (`WORKOUT_PRESETS`)
* **Alignment Note:** Each preset focuses on 1 or 2 clear language mechanics.

### Preset A: 21-15-9 Rep Scaling
> **Mechanic:** Rep scaling structure across multiple movements
```time
21-15-9
  Air Squats
  Pushups
```

### Preset B: Required Rest
> **Mechanic:** Forced timer rest (`*:30 Rest`) between rounds
```time
(3 Rounds)
  10 Burpees
  *:30 Rest
```

### Preset C: Timed Distance
> **Mechanic:** Fixed duration countdown with distance metric
```time
5:00 Run 400m
*:45 Rest
```

### Preset D: Load & Resistance
> **Mechanic:** Fixed sets with resistance load and timed recovery
```time
(5 Sets)
  5 Back Squat 185lb
  *1:00 Rest
```

---

## 3. 📚 Syntax Chapter Runway Scripts (6 Scroll Stages)

* **Configured in:** `markdown/canvas/home/README.md` (`scroll:chapters` block)

### Chapter 1: Basics
* **Source File:** `markdown/canvas/syntax/single-movement.md`
```time
Pushups
```

### Chapter 2: Protocols
* **Source File:** `markdown/canvas/syntax/timers-rest.md`
```time
5:00 Run
*:30 Rest
10 Burpees
```

### Chapter 3: Structure
* **Source File:** `markdown/canvas/syntax/groups-1.md`
```time
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
```

### Chapter 4: Custom Metrics
* **Source File:** `markdown/canvas/syntax/custom-metrics-1.md`
```time
5 Back Squat 225lb {"intensity": 80}
```

### Chapter 5: Dialects (Rock Climbing)
* **Source File:** `markdown/canvas/syntax/dialect-climb-bouldering.md`
* **Alignment Note:** Replaced WOD dialect with the complex Rock Climbing dialect.
```log:climbing
discipline: bouldering
rpe: 8

(Warmup)
  [Slab Warmup] V0 flash @1
  [Jug Ladder] V2 flash @1

(Project)
  [The Shield] V7 redpoint @12
```

### Chapter 6: Complex Workouts (Swimming)
* **Source File:** `markdown/collections/swimming-highschool/sprint-freestyle-power.md`
* **Alignment Note:** Updated from nested AMRAP to Swimming multi-set interval structure.
```time
(4) Power Sprints
  25m Freestyle Sprint
  1:30 Rest

(6) IM Main Set
  100m IM
  :45 Rest

150m Cooldown
```

---

## 4. 🧩 Landing Page Prototype Widgets

* **Configured in:** `playground/src/pages/PlaygroundLandingPage.tsx` via `src/content/syntaxGuideReference.ts`

### Widget 1: Classic AMRAP
* **Source File:** `markdown/canvas/syntax/classic-amrap.md`
```time
10:00 AMRAP
  10 Burpees
  15 Kettlebell Swings 24kg
  20 Box Jumps
```

### Widget 2: Simple Rounds
* **Source File:** `markdown/canvas/syntax/groups-1.md`
```time
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
```

### Widget 3: Timers & Rest
* **Source File:** `markdown/canvas/syntax/timers-rest.md`
```time
5:00 Run
*:30 Rest
10 Burpees
```

### Widget 4: Rep Schemes
* **Source File:** `markdown/canvas/syntax/groups-2.md`
```time
21-15-9
  Thrusters 95lb
  Pull-ups
```

---

## 5. 📄 Additional Standalone Home Sample Script

* **Source File:** `markdown/canvas/home/sample-script.md`

```time
(3 Rounds)
  10 Kettlebell Swings 24kg
  *:30 Rest
```
