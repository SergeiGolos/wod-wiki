Welcome to the **Wod.Wiki Playground** — an interactive scratchpad for [whiteboard-script](https://wod.wiki/syntax), a plain-text fitness scripting language. Edit the workout below, run it, and see your results — no account needed.

```widget:playground-run-tip
{}
```

# Morning Strength

```wod
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```

[▶ Run Workout]{.button action=start-workout} [New Note]{.button action=new-note variant=secondary}

---

## How the syntax works

The example above is a **3-round circuit**. Here's what each line does:

| Line | Concept | What it means |
|------|---------|---------------|
| `(3)` | **Rounds** | Repeat the indented block 3 times |
| `10 Kettlebell Swings 24kg` | **Movement** | 10 reps · exercise name · load |
| `*:30 Rest` | **Rest timer** | 30-second countdown between rounds |

Try editing any line — change `(3)` to `(5)` for five rounds, swap `24kg` for `32kg`, or add a new movement on a new line. Then press [▶ Run]{.button action=start-workout} to start the timer.

### More syntax to explore

| Concept | Example | What it does |
|---------|---------|--------------|
| **AMRAP** | `AMRAP 20:00` | As many rounds as possible in 20 minutes |
| **Countdown** | `2:00 Row` | 2-minute timed effort |
| **Rep schemes** | `21,15,9 Thrusters` | Three descending sets |
| **Section labels** | `## Warm-up` | Named groups that appear in the index |

Full reference → [whiteboard-script syntax docs](https://wod.wiki/syntax)

$CURSOR
