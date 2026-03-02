---
name: runtime-debugger
description: Debugs the WOD Wiki runtime engine by tracing output statements, stack levels, and lifecycle events for any workout script. Use when the runtime behavior is unexpected, outputs are missing, or stack transitions need verification.
---

# Runtime Debugger

This skill provides a specialized harness to trace the execution of any workout script through the Phase 4 runtime engine. It uses the same JIT compiler and strategies as the production app but runs in a controlled Node/Bun environment for deep inspection.

## Workflow

1.  **Identify the Script**: Extract the workout script that is causing issues or needs verification.
2.  **Run the Trace**: Execute the `debug-runtime.ts` script using `bun`.
3.  **Analyze Outputs**: Inspect the trace for:
    - `system` outputs (push/pop/next lifecycle)
    - `segment` and `completion` pairs (timing and results)
    - `milestone` events (round transitions)
    - `stackLevel` hierarchy (0 = root, 1+ = children)

## Tools

### `scripts/debug-runtime.ts`

A standalone Bun script that executes a workout session and dumps a detailed trace of all output statements.

**Parameters:**

- `--script` / `-s`: The workout script text to execute.
- `--file` / `-f`: Path to a file containing the workout script.
- `--steps` / `-n`: Maximum number of `userNext` calls to simulate (default: 10).
- `--advance` / `-a`: Amount of milliseconds to advance the clock before each `userNext` call (useful for timers/EMOMs).
- `--label` / `-l`: Display label for the debug session.

**Usage:**

```bash
# Basic trace of a simple exercise
bun .agent/skills/runtime-debugger/scripts/debug-runtime.ts --script "30 Clean & Jerk 135lb"

# Trace an AMRAP with clock advancement
bun .agent/skills/runtime-debugger/scripts/debug-runtime.ts --script "20:00 AMRAP\n5 Pullups" --advance 60000

# Trace a complex EMOM from a file
bun .agent/skills/runtime-debugger/scripts/debug-runtime.ts --file ./wod/2024.01.md --steps 20
```

## Best Practices

- **Pair Validation**: Ensure every `segment` has a matching `completion` from the same block.
- **Stack Hierarchy**: Verify that children are pushed at the correct depth (typically level 2 for children of `SessionRoot`).
- **Timing Check**: Use `--advance` to verify that timer-based completion logic triggers as expected.
- **System Events**: Watch `system` outputs to trace the exact sequence of `push` -> `mount` -> `next` -> `unmount` -> `pop`.
