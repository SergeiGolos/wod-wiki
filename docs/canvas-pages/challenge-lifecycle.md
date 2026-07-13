# Challenge Lifecycle — how challenges are presented, handled & completed across the canvas pages

This is the cross-cutting summary. It covers the **standalone Challenge page**
(`/challenge`), then traces a single challenge from *presentation* → *handling*
→ *completion* across every canvas page type, and maps the validation schemas
and storage that make it all work.

---

## The Challenge Page — `/challenge`

**Source:** `markdown/canvas/challenge/README.md`
**Frontmatter type:** `challenge` · **Route:** `/challenge`

A self-contained four-quest gauntlet. Unlike chapter pages (which feed home-page
badges), this page has **no chapter block** — its quests complete in place and
show only in the `ChallengeBanner`. It is the only page that mixes **live
syntax** quests with a **runtime** quest.

| Quest id | Label | Validation type | How to satisfy |
|---|---|---|---|
| `first-movement` | Add your first movement | `has-movement` | One movement line. |
| `first-timer` | Add a rest or time cap | `has-timer` | A Duration line, e.g. `*:30 Rest`. |
| `first-rounds` | Wrap it in rounds | `min-rounds` · `count: 3` | `(3 Rounds)` header. |
| `first-complete` | Run and complete the workout | `workout-complete` | Press **Run**, let the WallClock finish. |

The scratchpad (`wods/examples/challenge/welcome-2.md`) starts blank. The tip
on the page frames the whole page: *"every challenge wants you to add **one more
thing** to this script."*

**`workout-complete` is unique to this page.** It is not in the static validator
registry — it is handled by `useCompletionChallenge`, which watches the
fullscreen review state and fires when `fullscreen.results.completed === true`.

---

## The three tiers of challenge

The canvas pages present challenges at three levels of commitment:

```
        read-first                    type-to-pass                  run-to-pass
 ┌─────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
 │  Syntax reference   │      │   Chapter pages         │      │   Challenge page     │
 │  /guide/syntax/*    │      │   /chapters/*           │      │   /challenge         │
 │                     │      │                         │      │                      │
 │  No quests.         │      │  Live syntax quests.    │      │  Syntax quests +     │
 │  Examples you       │      │  Type into a blank      │      │  one runtime quest   │
 │  load + run.        │      │  scratchpad.            │      │  (run to finish).    │
 │                     │      │                         │      │                      │
 │  → onboarding step  │      │  → chapter badge        │      │  → in-page banner    │
 └─────────────────────┘      └─────────────────────────┘      └──────────────────────┘
```

| Tier | Pages | Input required | Reward |
|---|---|---|---|
| **Showcase** | `/guide/syntax/*` | Click "Try It →" (run a curated example) | Global onboarding step `ranWorkout` (indirect) |
| **Authoring** | `/chapters/basics\|sequences\|protocols` | Type valid syntax into a blank scratchpad | Chapter badge 🏆🏋️⏱️ on the home banner |
| **Execution** | `/challenge` | Type valid syntax **and** run the workout to completion | In-page `ChallengeBanner` all-complete |

---

## How challenges are PRESENTED

A challenge surfaces to the user through the **`ChallengeBanner`**, rendered
inline near the canvas editor on any page that ships `quest` blocks. The banner
is purely presentational — it reads all state from `useSyntaxChallenge`.

- **One row per quest**, in frontmatter order.
- Each row shows: a **pass/fail icon** (✓ `CheckCircle2` / ○ `Circle`), the quest
  **label**, and a **live hint** — the validator's `reason` (when failing) or
  `detail` (when passing), updating on every keystroke.
- The header shows `stepsComplete / totalSteps` and a "all complete" sparkle
  state when every quest passes.
- Quests with **no validation schema** render disabled and never pass (a
  frontmatter typo can't silently complete).

The **chapter badges** are presented separately, on the home page's
`OnboardingBanner`: a per-chapter row with the badge icon, a
`completedCount/totalCount` counter, and "Chapter complete." / "N quests
remaining." text.

---

## How challenges are HANDLED (the validation pipeline)

```
 editor keystroke
      │
      ▼
 ScriptBlock { content, statements: undefined }      ← editor emits raw content
      │
      ▼
 useSyntaxChallenge  ── re-parses block.content ──▶  parsed statements
      │  (memoised on content; parser built per-call, lightweight)
      ▼
 validateScriptBlock(block, quest.validation)
      │
      ▼
 VALIDATORS[schema.type]  ──▶  { pass, reason?, detail? }
      │
      ├─ pass? ──▶ markComplete(questId)   (idempotent, once per mount)
      └─ fail?  ──▶ banner shows reason as the live hint
```

### The validator registry (`syntaxChallengeValidator.ts`)

| `type` | Logic | Operates on |
|---|---|---|
| `has-movement` | `countMovements > 0` | parsed statement tree |
| `exactly-movements` | `countMovements === count` | parsed statement tree |
| `has-reps` | any non-synthetic `Rep` metric | parsed statement tree |
| `has-timer` | any non-synthetic `Duration`/`Time` metric | parsed statement tree |
| `min-rounds` | `totalRounds >= count` | parsed statement tree |
| `contains-token` | `block.content.includes(value)` | **raw unparsed text** |
| `workout-complete` | *(not in registry)* | runtime review state (see below) |

**Synthetic-statement guard.** The parser injects a synthetic statement at the
top of every `wod` block (carrying `{ type:'effort', value:'wod' }` and a
`domain.wod` hint). Every tree-walking validator skips it via `isSynthetic()` —
otherwise an empty fence or a markdown heading would pass `has-movement`.

**Unknown-type safety.** `validateScriptBlock` returns `{ pass:false, reason }`
for any type not in the registry. Nothing passes by accident.

### The two completion hooks

| Hook | Fires on | Quests it handles |
|---|---|---|
| `useSyntaxChallenge` | live re-parse of editor content (per keystroke, debounced) | every quest whose `validation.type` is in the registry |
| `useCompletionChallenge` | fullscreen review reaching `results.completed === true` | only `validation.type === 'workout-complete'` |

`useCompletionChallenge` filters its quest list to `workout-complete` quests,
watches the `fullscreen` state, and marks each complete exactly once (a `fired`
ref guards duplicates within a mount).

---

## How challenges are COMPLETED (storage & aggregation)

### Per-page ledger
- **Key:** `localStorage["wodwiki.quests.v1"]`
- **Shape:** `Record<pageRoute, Record<questId, boolean>>` — namespaced by route
  so identical quest ids on different pages (e.g. two chapters with `rounds`
  quests) never collide.
- **Write:** `markQuestComplete(pageRoute, questId)` — **monotonic** in
  production (once true, stays true). A `toggleQuestState` sandbox path exists
  for Storybook debugging.
- **Reactivity:** a synthetic `storage` event is dispatched on write, so all
  mounted hooks re-read.

### Cross-route badge aggregation (`useChapterProgress`)
Chapter badges live in the home-page `OnboardingBanner`, but their quests are
completed on chapter pages. The hook:

1. Reads the **entire** ledger once (and on every `storage` event).
2. For each chapter, checks each `questId` across **all** routes — `isDone(id)`
   returns true if **any** route has it marked.
3. `isComplete = questIds.length > 0 && questIds.every(isDone)`.

This is the contract that lets the home page declare chapter blocks (referencing
quests it doesn't own) and still show correct progress.

### Global onboarding steps (parallel system)
- **Key:** `localStorage["wodwiki.onboarding.v1"]` — five booleans.
- Independent of quests/chapters; marked at action sites (`editedNote`,
  `ranWorkout`, `loggedEffort`, `openedReview`; `visitedLanding` auto on mount).
- Unknown keys coerce to `false`, so the set is version-tolerant.

---

## End-to-end: one quest's journey

Taking `sequences-rounds` (`min-rounds` · `count: 2`) on `/chapters/sequences`:

1. **Present.** Page parses its `quest` block; `ChallengeBanner` shows
   "Add a 2+ round header" with a fail pill and the hint
   *"Need at least 2 rounds — found 0."*
2. **Handle.** User types `(2 Rounds)`. `useSyntaxChallenge` re-parses
   `block.content`; the `(2 Rounds)` header compiles to a `Rounds: 2` metric on
   the parent statement. `totalRounds >= 2` → `{ pass: true, detail: "2 rounds" }`.
3. **Complete.** The hook calls `markComplete('/chapters/sequences',
   'sequences-rounds')` → writes the ledger under that route. The banner pill
   flips to ✓.
4. **Aggregate.** Home page's `useChapterProgress` sees the ledger entry;
   `sequences-rounds` is now done. Once `sequences-timer` is also done, the
   🏋️ Sequences badge lights up on the home banner.

---

## Summary table — every challenge across the canvas

| Page | Quest id | Validation | Reward | Measured by |
|---|---|---|---|---|
| `/chapters/basics` | `basics-movement` | `has-movement` | 🏆 Basics badge | Effort metric on a non-synthetic statement |
| `/chapters/basics` | `basics-reps` | `has-reps` | 🏆 Basics badge | Rep metric present |
| `/chapters/sequences` | `sequences-timer` | `has-timer` | 🏋️ Sequences badge | Duration/Time metric present |
| `/chapters/sequences` | `sequences-rounds` | `min-rounds` (2) | 🏋️ Sequences badge | Sum of Rounds metrics ≥ 2 |
| `/chapters/protocols` | `protocols-rounds` | `min-rounds` (3) | ⏱️ Protocols badge | Sum of Rounds metrics ≥ 3 |
| `/chapters/protocols` | `protocols-tag` | `contains-token` `AMRAP` | ⏱️ Protocols badge | Raw text includes "AMRAP" |
| `/challenge` | `first-movement` | `has-movement` | in-page banner | Effort metric present |
| `/challenge` | `first-timer` | `has-timer` | in-page banner | Duration/Time metric present |
| `/challenge` | `first-rounds` | `min-rounds` (3) | in-page banner | Sum of Rounds metrics ≥ 3 |
| `/challenge` | `first-complete` | `workout-complete` | in-page banner | Review `completed === true` |
| `/guide/syntax/*` | — | — | onboarding `ranWorkout` (indirect) | run action site |
