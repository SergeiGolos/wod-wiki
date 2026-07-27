Type: grilling
Status: resolved

## Question

Decide the exact extension to the `Quest.validation` schema (defined in `playground/src/services/syntaxChallengeValidator.ts` and consumed by `useSyntaxChallenge` + `parseCanvasMarkdown.ts`) that represents "the user completed this workout." Specifically: pick the validation type name and the minimum fields it must carry to be both expressible in frontmatter (`markdown/canvas/challenge/README.md` shows the YAML shape) and enforceable by `useSyntaxChallenge` — including whether it needs to inspect workout results (`WorkoutResults` from `@/components/Editor/types`) for things like duration / completed-flag / segment count, and whether that pulls the validator into runtime territory it has never occupied before. The decision is the contract every downstream ticket (wiring, handoff, trigger moment) hangs off.

## Answer

The new "workout completed" quest type reuses the existing `Quest.validation` field with a new discriminator value, NOT a new top-level field. The validator stays strictly block-pure; a sibling runtime hook owns the new type.

**Schema (frontmatter YAML)**:

```yaml
quests:
  - id: try-the-timer
    label: Run a workout
    desc: Launch the timer and finish a workout.
    validation:
      type: workout-complete
```

The `validation` field shape stays `{ type, [key]: unknown }`. `type: workout-complete` carries no required fields today — the trigger semantics (ticket 04) may add optional fields like `min-segments` or `min-duration-ms` if needed; the schema permits them via the index signature.

**Runtime dispatch**:

1. A new `useCompletionChallenge` hook (or equivalent — name TBD by the wiring ticket) lives next to `useSyntaxChallenge` and reads the page's quests.
2. For each quest whose `validation.type === 'workout-complete'`, it subscribes to workout-completion events from `useCanvasRuntime.handleViewComplete` (the wiring ticket chooses the exact channel).
3. When the event fires, the hook calls `usePageQuests.markComplete(questId)`.
4. The `validateAllQuests` validator pipeline **does not** see `type: workout-complete` — the completion hook filters those out before the validator runs, OR `useSyntaxChallenge` skips them in its validation loop. The validator's deny-on-unknown default is preserved for everything else.

**Why this shape**:

- The validator (`syntaxChallengeValidator.ts:11–12`) is explicitly designed to be block-pure — its input is a `ScriptBlock`, nothing else. Adding a `WorkoutResults` parameter to every validator function would force a runtime import into a file that today only depends on `Metric`, `ICodeStatement`, `ScriptBlock`. That breaks the layering.
- A sibling hook preserves the frontmatter ergonomics (one `validation:` field per quest, one discriminator) without smuggling runtime state into the validator.
- The `Quest` interface (`parseCanvasMarkdown.ts:116`) needs no change — its `validation?: { type: string; [key: string]: unknown }` already supports the new type.

**Hand-off to ticket 05 (wiring)**:

- Decide the exact channel between `useCanvasRuntime.handleViewComplete` and the new completion hook (event subscription vs. direct call).
- Decide the new hook's location and name (`useCompletionChallenge` is a placeholder).
- Ensure `useSyntaxChallenge` filters out `type: workout-complete` quests before calling `validateAllQuests`.

**Hand-off to ticket 04 (trigger semantics)**:

- If the decision is "completion only counts when `results.completed === true` AND `segments.length >= N`," then `validation: { type: workout-complete, min-segments: 3 }` becomes the frontmatter shape. The validator never reads `min-segments`; the completion hook does.

**Frontmatter example** (`markdown/canvas/challenge/README.md` will need an entry):

```yaml
```quest
id: launch-and-finish
label: Launch the timer
desc: Press Run and finish your first workout.
validation:
  type: workout-complete
```
```