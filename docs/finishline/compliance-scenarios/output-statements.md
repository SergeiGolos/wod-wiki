# Output Statement Scenarios

## Rules

Every runtime block emits **exactly two** output statements:
1. **Segment** — on mount (block becomes active)
2. **Completion** — on pop (block finishes)

Each output carries:
- `outputType` — `'segment'` or `'completion'`
- `sourceBlockKey` — ID of the block that emitted it
- `stackLevel` — depth in the stack (root = 1)

---

## 🟢 Single Effort — Output Pairing

```wod
10 Pullups
```

| # | Type | Source | Level | Trigger |
|---|------|--------|-------|---------|
| 1 | segment | SessionRoot | 1 | session start |
| 2 | segment | WaitingToStart | 2 | gate mounted |
| 3 | completion | WaitingToStart | 2 | user starts |
| 4 | segment | Effort | 2 | effort mounted |
| 5 | completion | Effort | 2 | user completes |
| 6 | completion | SessionRoot | 1 | session ends |

**Assert:** 6 outputs, 3 pairs. `assertPairedOutputs()` returns no orphans.

---

## 🟢 Loop — Output Count Formula

```wod
(3)
  10 Pullups
```

Expected outputs:

| Block | Segments | Completions | Total |
|-------|----------|-------------|-------|
| SessionRoot | 1 | 1 | 2 |
| WaitingToStart | 1 | 1 | 2 |
| Rounds | 1 | 1 | 2 |
| Effort × 3 | 3 | 3 | 6 |
| **Total** | **6** | **6** | **12** |

**Assert:** output count ≥ 12. All paired.

---

## 🟢 Stack Level Correctness

```wod
(3)
  10 Pullups
```

| Block | Expected `stackLevel` |
|-------|-----------------------|
| SessionRoot | 1 |
| Rounds | 2 |
| Effort | 3 |

**Assert:** `tracer.atLevel(1)` returns SessionRoot outputs, `atLevel(3)` returns Effort outputs.

---

## 🟢 Source Block Key Consistency

```wod
10 Pullups
15 Pushups
```

**Assert:**
- `tracer.fromBlock('effort-pullups')` returns exactly 1 segment + 1 completion
- `tracer.fromBlock('effort-pushups')` returns exactly 1 segment + 1 completion
- No block key appears with mismatched segment/completion count

---

## 🟢 AMRAP Output Pairing Under Auto-Termination

```wod
2:00 AMRAP
  5 Burpees
```

| Phase | Outputs emitted |
|-------|----------------|
| Session start | 2 segments (root + gate) |
| User starts | 1 completion (gate) + 1 segment (AMRAP) + 1 segment (child) |
| User completes R1 | 1 completion (child) + 1 segment (child R2) |
| Timer expires (2:00) | 1 completion (child R2) + 1 completion (AMRAP) + 1 completion (root) |

**Assert:** even though timer force-clears children, **all segments still get completion partners**. `assertPairedOutputs()` passes.
