# Challenge Lifecycle — how challenges are presented, handled & completed across the canvas pages

This is the cross-cutting summary. It traces a single challenge from *presentation* → *handling* → *completion* across the current playground canvas pages, and maps the validation schemas and storage that make it all work.

The canvas has been restructured around four page types:

1. **Home** (`/`) — a quick-start quest chain with a live demo editor.
2. **Syntax index** (`/guide/syntax`) — a reference landing page with no quests.
3. **Tutorial quest pages** (`/guide/syntax/*`) — six guided pages, each with live syntax quests and a chapter badge.
4. **Retired challenge page** (`/challenge`) — no longer reachable; redirects to `/`.

---

## The four page types

### Home — `/` (`markdown/canvas/home/README.md`)

The home page carries its own **Quick-Start** quest chain, presented in the `ChallengeBanner` above the live demo editor.

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `qs-arrive` | Welcome to WOD Wiki | none | Auto-completed on mount by `useQuickStartAutoComplete`. |
| `qs-edit` | Change the workout | none | Auto-completed by `useQuickStartAutoComplete` when the demo editor content diverges from `initialSource`. |
| `qs-run` | Run it to the finish | `workout-complete` | Press **Run** and let the workout complete; handled by `useCompletionChallenge`. |

The home page also declares the six tutorial chapters in `chapter` blocks so that the global `OnboardingBanner` can show cross-route progress.

### Syntax index — `/guide/syntax` (`markdown/canvas/syntax/README.md`)

A pure reference page. **No quests, no chapter blocks.** It links into the six tutorial pages and lets the user open a new workout note. The editor preview on this page is read-only from a challenge perspective — running examples does not write to the quest ledger.

### Tutorial quest pages — `/guide/syntax/*`

Each tutorial page is a self-contained lesson with a live editor, a `quest` block, and a `chapter` block. The chapter badge is displayed on the home page (`OnboardingBanner`), while the quests themselves are completed on the tutorial page.

| Page | Source | Chapter | Quests |
|---|---|---|---|
| `/guide/syntax/basics` | `syntax/basics.md` | basics (trophy) | `basics-movement`, `basics-reps`, `basics-load` |
| `/guide/syntax/structure` | `syntax/structure.md` | structure (blocks) | `structure-rounds`, `structure-repscheme` |
| `/guide/syntax/protocols` | `syntax/protocols.md` | protocols (timer) | `protocols-timer`, `protocols-rounds`, `protocols-tag` |
| `/guide/syntax/complex` | `syntax/complex.md` | complex (puzzle) | `complex-time`, `complex-rounds` |
| `/guide/syntax/custom-metrics` | `syntax/custom-metrics.md` | custom-metrics (activity) | `metrics-custom`, `metrics-calc` |
| `/guide/syntax/dialects` | `syntax/dialects.md` | dialects (file-text) | `dialects-log`, `dialects-climb` |

### Retired challenge page — `/challenge`

The old standalone challenge page has been retired. Its route now redirects to `/`. The four-quest gauntlet (`first-movement`, `first-timer`, `first-rounds`, `first-complete`) is no longer reachable. Challenge-style discovery is now handled by the home quick-start chain and the tutorial quest pages.

---

## How challenges are PRESENTED

A challenge surfaces to the user through the **`ChallengeBanner`**, rendered inline near the canvas editor on any page that ships `quest` blocks. The banner is purely presentational — it reads all state from `useSyntaxChallenge`.

- **One row per quest**, in frontmatter order.
- Each row shows: a **pass/fail icon** (✓ `CheckCircle2` / ○ `Circle`), the quest **label**, and a **live hint** — the validator's `reason` (when failing) or `detail` (when passing), updating as the user types or edits.
- The header shows `stepsComplete / totalSteps` and a sparkle state when every quest passes.
- Quests with **no validation schema** remain in a non-passing state until something else marks them complete (e.g. `qs-arrive`/`qs-edit` on the home page). Their live hint falls back to the validator's `reason` or *"Open the editor to begin."* A frontmatter typo cannot silently complete a quest.

The **chapter badges** are presented separately, on the home page's `OnboardingBanner`: a per-chapter row with the badge icon, a `completedCount/totalCount` counter, and "Done" / remaining text. That badge is driven by `useChapterProgress`, not by the local `ChallengeBanner`.

---

## How challenges are HANDLED (the validation pipeline)

The canvas page wires three hooks together:

```
 editor keystroke / mount / run-complete
      │
      ├─ live content ──▶ useSyntaxChallenge
      ├─ mount/edit divergence ──▶ useQuickStartAutoComplete
      └─ review completed ──▶ useCompletionChallenge
```

### `useSyntaxChallenge` — live syntax validation

Observes the active `ScriptBlock` and the page's `quest` list. On every keystroke (debounced upstream), it re-parses `block.content` through `MdTimerRuntime.read()` and runs each quest's `validation` schema through `validateScriptBlock`. When a quest passes and is not yet marked complete, it calls `markComplete(questId)` exactly once per mount.

- `workout-complete` quests are skipped here; they return `{ pass: false, reason: 'Validated at runtime.' }` so the banner can show that state.
- Already-completed quests are overridden to `{ pass: true, detail: 'Completed' }` in the returned result so the banner shows a clean success state even if the editor no longer passes the validator.

### `useCompletionChallenge` — runtime workout completion

Filters the quest list to `validation.type === 'workout-complete'` and watches the `fullscreen` runtime state. When `fullscreen.kind === 'review'` and `fullscreen.results.completed === true`, it marks every matching quest complete once per mount (guarded by a `firedRef`).

Used for `qs-run` on the home page and previously for `first-complete` on the retired `/challenge` page.

### `useQuickStartAutoComplete` — mount/edit events

Auto-completes the home-page quick-start quests for events the static syntax validator cannot see:

- `qs-arrive` — marks complete on mount (endowed progress).
- `qs-edit` — marks complete when the current editor source diverges from `initialSource`.
- `qs-run` — left to `useCompletionChallenge` (`workout-complete`).

Safe on any page; if no `qs-arrive`/`qs-edit` quests exist, it is a no-op.

---

## How challenges are COMPLETED (storage & aggregation)

### Per-page ledger

- **Key:** `localStorage["wodwiki.quests.v1"]`
- **Shape:** `Record<pageRoute, Record<questId, boolean>>` — namespaced by route so identical quest ids on different pages never collide.
- **Write:** `markQuestComplete(pageRoute, questId)` from `usePageQuests` — monotonic in production (once true, stays true). A `toggleQuestState` sandbox path exists for Storybook debugging.
- **Reactivity:** `usePageQuests` listens to the browser `storage` event and re-reads after local writes, so the banner and badges update without a page reload.

### Cross-route badge aggregation (`useChapterProgress`)

Chapter badges live on the home page, but their quests are completed on the tutorial pages. The hook:

1. Reads the **entire** ledger once and on every `storage` event keyed to `wodwiki.quests.v1`.
2. For each chapter, checks each `questId` across **all** routes — `isDone(id)` returns true if any route has it marked complete.
3. `isComplete = questIds.length > 0 && questIds.every(isDone)`.

Because the ledger is route-scoped but the lookup is cross-route, the home page can declare chapter blocks that reference quests completed on any tutorial page and still show correct progress.

### Global onboarding steps (parallel system)

- **Key:** `localStorage["wodwiki.onboarding.v1"]` — five booleans.
- Independent of quests/chapters; marked at action sites (`editedNote`, `ranWorkout`, `loggedEffort`, `openedReview`; `visitedLanding` auto on mount).
- Unknown keys coerce to `false`, so the set is version-tolerant.

---

## Validator types

The `syntaxChallengeValidator.ts` registry supports the following types. Unknown types fail closed.

| Type | Logic | Required schema field | Operates on |
|---|---|---|---|
| `has-movement` | `countMovements > 0` | — | parsed statement tree |
| `has-reps` | any non-synthetic `Rep` metric | — | parsed statement tree |
| `has-timer` | any non-synthetic `Duration`/`Time` metric | — | parsed statement tree |
| `min-rounds` | `totalRounds >= count` | `count` | parsed statement tree |
| `contains-token` | `block.content.includes(value)` | `value` | raw editor text |
| `workout-complete` | *(not in registry)* | — | runtime review state |

**Synthetic-statement guard.** The parser injects a synthetic statement at the top of every `wod` block carrying `{ type:'effort', value:'wod' }` and a `domain.wod` hint. Every tree-walking validator skips it via `isSynthetic()` — otherwise an empty fence or a markdown heading would pass `has-movement`.

**Unknown-type safety.** `validateScriptBlock` returns `{ pass:false, reason: 'Unknown validation type "..."' }` for any type not in the registry. Nothing passes by accident.

---

## Summary table — every quest across the canvas

| Page | Quest id | Validation | Reward / aggregation | Measured by |
|---|---|---|---|---|
| `/` | `qs-arrive` | none | Quick-start banner | Mount event |
| `/` | `qs-edit` | none | Quick-start banner | Content divergence from `initialSource` |
| `/` | `qs-run` | `workout-complete` | Quick-start banner | Review `completed === true` |
| `/guide/syntax/basics` | `basics-movement` | `has-movement` | 🏆 Basics badge | Effort metric on a non-synthetic statement |
| `/guide/syntax/basics` | `basics-reps` | `has-reps` | 🏆 Basics badge | Rep metric present |
| `/guide/syntax/basics` | `basics-load` | `contains-token` `lb` | 🏆 Basics badge | Raw text includes `lb` |
| `/guide/syntax/structure` | `structure-rounds` | `min-rounds` (2) | 🧱 Structure badge | Sum of Rounds metrics ≥ 2 |
| `/guide/syntax/structure` | `structure-repscheme` | `contains-token` `21-15-9` | 🧱 Structure badge | Raw text includes `21-15-9` |
| `/guide/syntax/protocols` | `protocols-timer` | `has-timer` | ⏱️ Protocols badge | Duration/Time metric present |
| `/guide/syntax/protocols` | `protocols-rounds` | `min-rounds` (3) | ⏱️ Protocols badge | Sum of Rounds metrics ≥ 3 |
| `/guide/syntax/protocols` | `protocols-tag` | `contains-token` `AMRAP` | ⏱️ Protocols badge | Raw text includes `AMRAP` |
| `/guide/syntax/complex` | `complex-time` | `has-timer` | 🧩 Complex badge | Duration/Time metric present |
| `/guide/syntax/complex` | `complex-rounds` | `min-rounds` (2) | 🧩 Complex badge | Sum of Rounds metrics ≥ 2 |
| `/guide/syntax/custom-metrics` | `metrics-custom` | `contains-token` `rpe` | 📊 Custom Metrics badge | Raw text includes `rpe` |
| `/guide/syntax/custom-metrics` | `metrics-calc` | `contains-token` `calculate` | 📊 Custom Metrics badge | Raw text includes `calculate` |
| `/guide/syntax/dialects` | `dialects-log` | `contains-token` `\`\`\`log` | 📋 Dialects badge | Raw text includes the token declared in source |
| `/guide/syntax/dialects` | `dialects-climb` | `contains-token` `\`\`\`climb` | 📋 Dialects badge | Raw text includes the token declared in source |
| `/guide/syntax` | — | — | none | no quests |
| `/challenge` (retired) | — | — | — | redirects to `/` |

---

## End-to-end: one quest's journey

Taking `structure-rounds` (`min-rounds` · `count: 2`) on `/guide/syntax/structure`:

1. **Present.** The page parses its `quest` block; `ChallengeBanner` shows "Wrap movements in 2+ rounds" with a fail pill and the hint *"Need at least 2 rounds — found 0."*
2. **Handle.** The user types `(2 Rounds)`. `useSyntaxChallenge` re-parses `block.content`; the `(2 Rounds)` header compiles to a `Rounds: 2` metric on the parent statement. `totalRounds >= 2` → `{ pass: true, detail: "2 rounds" }`.
3. **Complete.** The hook calls `markComplete('/guide/syntax/structure', 'structure-rounds')` → writes the ledger under that route. The banner pill flips to ✓.
4. **Aggregate.** The home page's `useChapterProgress` sees the ledger entry; `structure-rounds` is now done. Once `structure-repscheme` is also done, the 🧱 Structure badge lights up on the home banner.
