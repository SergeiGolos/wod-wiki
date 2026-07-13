# Chapter Pages — `/chapters/basics` · `/chapters/sequences` · `/chapters/protocols`

**Sources:** `markdown/canvas/guide/syntax/{basics,sequences,protocols}/README.md`
**Frontmatter type:** `guide-chapter`
**Template:** canvas (split-canvas: prose left, scratchpad editor right)

The three chapter pages are the **quest-driven** interactive challenges. Each
asks the user to write something specific into a live scratchpad; the
`ChallengeBanner` flips each quest to **complete** the instant the script
satisfies its validation schema. Completing every quest on a page unlocks that
chapter's badge on the home page.

All three share the same anatomy: a title block, page-level `quest` blocks, a
self-referencing `chapter` block, a single `view` panel (the scratchpad), a
"Try it" explainer, and "What's next" navigation buttons.

---

## Shared scratchpad model

Each page's `view` panel loads a **blank or near-blank scratchpad** source (e.g.
`wods/examples/guide/syntax/basics/welcome.md`), not a finished example. The
scratchpad is an empty ` ```wod ``` ` fence plus a one-line tip. The user types
into it; validation runs live.

> There are **no `example` tabs** and **no `command` source-swaps** on chapter
> pages. The single editable scratchpad *is* the example surface. Everything the
> user needs to complete is typed by hand.

---

## Chapter 1 — Basics  `/chapters/basics`

**Content:** Build the smallest meaningful workout — one movement, one rep count.
A movement line is just an exercise name with a rep count (`10 KB Swings`),
compiling to one `Effort` + one `Rep` metric.

**Sections:** "Try it" (the scratchpad + how a movement line compiles),
"What's next" (badge-unlock explainer + nav).

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `basics-movement` | Add a movement | `has-movement` | Type one line with a named exercise + rep count. |
| `basics-reps` | Add a rep count | `has-reps` | Any integer on a movement line. |

**Examples by section:** none beyond the scratchpad itself.

**Accomplishment:** 🏆 **Basics** badge (trophy) unlocks in the home-page
`OnboardingBanner`.

**Measurement:**
- `has-movement` → `countMovements(statements) > 0` — a non-synthetic statement
  carrying an `Effort` metric. (Synthetic dialect-hint statements injected by
  the parser are skipped so an empty `wod` fence or a heading never passes.)
- `has-reps` → `hasReps(statements)` — any non-synthetic statement carrying a
  `Rep` metric.

---

## Chapter 2 — Sequences  `/chapters/sequences`

**Content:** Add timing and repetition — a rest/timer line and a round header.
A timer line starts with `*` and a Duration (`*:30 Rest`); round headers go in
`(...)` at the top (`(3 Rounds)` creates a `Rounds: 3` metric).

**Sections:** "Try it" (scratchpad + timer/round-header grammar),
"What's next" (nav to Protocols / back to Basics).

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `sequences-timer` | Add a rest or time cap | `has-timer` | Any Duration line, e.g. `*:30 Rest`. |
| `sequences-rounds` | Add a 2+ round header | `min-rounds` · `count: 2` | Type `(2 Rounds)` or higher. |

**Accomplishment:** 🏋️ **Sequences** badge (dumbbell) unlocks.

**Measurement:**
- `has-timer` → `hasTimer(statements)` — any non-synthetic statement carrying a
  `Duration` or `Time` metric.
- `min-rounds` → `totalRounds(statements) >= 2` — sums every `Rounds` metric
  value across non-synthetic statements.

---

## Chapter 3 — Protocols  `/chapters/protocols`

**Content:** Build a structured protocol — a 3-round cap with a workout-type tag.
The `AMRAP` token (or `EMOM`, `TABATA`, `FOR TIME`) tells the journal how to
score the session.

**Sections:** "Try it" (scratchpad + protocol grammar),
"What's next" (capstone note: all three badges → OnboardingBanner fully done).

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `protocols-rounds` | Add a 3-round cap | `min-rounds` · `count: 3` | Type `(3 Rounds)` at the top. |
| `protocols-tag` | Add a workout tag | `contains-token` · `value: AMRAP` | Include the literal token `AMRAP` in the script. |

**Accomplishment:** ⏱️ **Protocols** badge (timer) unlocks. When all three
chapter badges are unlocked the banner shows a fully-completed state.

**Measurement:**
- `min-rounds` → `totalRounds(statements) >= 3`.
- `contains-token` → `block.content.includes("AMRAP")` — a **raw text**
  substring match against the unparsed editor content (not the metric tree), so
  the token can appear anywhere.

---

## How challenge completion flows (all three pages)

1. **Live re-parse.** The editor emits `ScriptBlock` snapshots with
   `statements: undefined`; `useSyntaxChallenge` re-parses `block.content` via
   the runtime parser (memoised on content) before validating.
2. **Per-quest validation.** Each quest's `validation` schema runs through
   `validateScriptBlock`; unknown types return `{ pass: false }` so a frontmatter
   typo never silently passes.
3. **Banner feedback.** `ChallengeBanner` renders one row per quest with a live
   pass/fail pill and the validator's `reason`/`detail` hint, updating per
   keystroke.
4. **Mark done.** When a quest passes, the hook calls `markComplete(questId)`
   (idempotent) → writes `wodwiki.quests.v1` under the page's route.
5. **Badge aggregation.** `useChapterProgress` (on the home page) ORs the ledger
   across routes; the chapter badge lights up once all its quest ids are done.

---

## Cross-page detail: the `chapter` block

Each chapter page carries a **self-referencing `chapter` block**:

```yaml
id: basics
title: Basics
badge: trophy
quests: basics-movement, basics-reps
sections: []
```

On chapter pages `sections: []` (empty) because the home page owns the
section→chapter mapping. The `quests` list is the source of truth for badge
completion; it must match the page's own `quest` ids.
