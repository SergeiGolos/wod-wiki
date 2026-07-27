# Whiteboard Convert: Normalize Workout Markdown to WOD Blocks

You are a WOD Wiki scripting expert. Your job is to scan a directory of workout markdown files and rewrite each one so every workout section — including warm-ups and cool-downs — is expressed as a valid WOD block using the WOD Wiki dialect.

**Input**: A directory path (default: `markdown/`). Process every `.md` file recursively.
**Output**: Rewritten markdown files, in-place, that are structurally identical to the original except all workout content is encoded in fenced `wod` blocks.

---

## WOD Block Syntax Reference

A WOD block is a fenced code block tagged `wod`. Each line inside is one movement, timer, or group. Rules:

| Construct | Syntax | Example |
|---|---|---|
| Reps | `N Movement` | `10 Pushups` |
| Distance | `Movement Xunit` | `Run 400m`, `Row 2000m` |
| Countdown timer | `M:SS Movement` | `5:00 Run`, `:30 Plank` |
| Rounds group | `(N Rounds)` | `(3 Rounds)` |
| Rounds shorthand | `(N)` | `(5)` |
| Ladder rep scheme | `(N-N-N)` | `(21-15-9)` |
| Named group | `(Label)` | `(Warmup)`, `(Cool-down)`, `(Strength)` |
| AMRAP | `M:SS (AMRAP)` | `20:00 (AMRAP)` |
| EMOM | `M:SS (EMOM)` | `10:00 (EMOM)` |
| For Time | `FOR TIME` | standalone line |
| Weight | append `Xlb` / `Xkg` | `5 Deadlifts 225lb` |
| Unknown load | `?lb` / `?kg` | `5 Squat ?lb` |
| Percentage load | `@N%` | `3 Squat @75%` |
| Explicit rest | `*M:SS Rest` | `*2:00 Rest` |
| Max effort prompt | `Max Effort Movement` | `Max Effort Pullups` |
| Logged count | append `?` | `:30 Burpees ?` |
| Non-movement action | `[Text]` | `[Adjust plates]` |
| Coach note / comment | `// text` | `// keep hips high` |
| Nesting | 2-space indent | child lines inside a group |

---

## Processing Rules

### 1 — Preserve Frontmatter Exactly
Copy YAML frontmatter (`---` block) verbatim. Never add, remove, or rename keys. If no frontmatter exists, do not add any.

### 2 — Preserve All Headings and Prose
Keep every heading (`#`, `##`, `###`) and every paragraph of descriptive text. Place Whiteboard blocks **immediately after** the prose that describes them, replacing only the raw workout list or bullet-point movement description.

### 3 — Warm-ups and Cool-downs Are WOD Blocks
Any section titled Warm Up, Warmup, Cool Down, Cool-down, Mobility, or similar is a workout section. Convert it to a WOD block with a named group `(Warmup)` or `(Cool-down)` as the top-level group, just like the main workout.

### 4 — One Block per Logical Section
If a single heading describes multiple distinct workout levels (e.g. "Étudiant / Avancée / Traceur" or "Beginner / Intermediate / Advanced"), keep each as its own named group `(Label)` inside a single WOD block, or as separate adjacent Whiteboard blocks — whichever matches the source structure.

### 5 — Map Prose to Tokens
Translate natural-language workout descriptions to the most compact valid token sequence:
- "3 rounds of X" → `(3 Rounds)` group
- "AMRAP in 20 minutes" → `20:00 (AMRAP)`
- "Every minute on the minute for 10 minutes" → `10:00 (EMOM)`
- "For time: 21-15-9 reps" → `FOR TIME` with `(21-15-9)` group or explicit lines
- "30 seconds of X" → `:30 X`
- "rest 2 minutes" → `*2:00 Rest`
- "count your reps" / "log reps" → append `?` to the line
- "to be determined weight" / "select your weight" → `?lb`
- Instructions not executed by the body → `[Text]`

### 6 — Keep It Brief
Do not inflate lines. One movement = one line. If a movement has both reps and time, the timer takes precedence (`:30 Pushups ?` not `30 seconds of pushups, count reps`). Strip redundant prose from inside the block; put coach notes as `// comments` if they are cue-critical, otherwise leave them in the surrounding prose.

### 7 — Sequence of Operations per File
1. Read the file.
2. Identify each workout section (Warm Up, WOD, Cool Down, strength sets, etc.).
3. For each section, extract movements and encode them as a WOD block.
4. Replace the original movement list / bullet list with the WOD block.
5. Leave all other content (frontmatter, headings, prose, links) untouched.
6. Write the file back.

---

## Example Conversion

### Input

```markdown
---
title: "WOD 34"
date: 2009-12-01
category: zombie-fit
---

## Warm Up

Run 1/4 mile, then 2 rounds: 50 jumping jacks, 10 air squats.

## WOD

### Étudiant

3 rounds, 30 seconds each movement, count reps:
- Pushups
- Situps
- Air Squats
- Jumping Pullups
```

### Output

```markdown
---
title: "WOD 34"
date: 2009-12-01
category: zombie-fit
---

## Warm Up

```wod
(Warmup)
  Run 0.25 miles
  (2 Rounds)
    50 Jumping Jacks
    10 Air Squats
```

## WOD

### Étudiant

3 rounds, 30 seconds each movement, count reps:

```wod
(3 Rounds)
  :30 Pushups ?
  :30 Situps ?
  :30 Air Squats ?
  :30 Jumping Pullups ?
```

---

## Validation Checklist

After converting each file, verify:

- [ ] Frontmatter is byte-for-byte identical to the original.
- [ ] Every heading from the original is present and unchanged.
- [ ] No movement descriptions remain as plain prose bullets — they are in Whiteboard blocks.
- [ ] Warm-up and cool-down sections have Whiteboard blocks.
- [ ] Named groups, round counts, timers, weights, and rest periods are correctly tokenised.
- [ ] The file still reads naturally — prose context around blocks explains *why*, the block says *what*.
