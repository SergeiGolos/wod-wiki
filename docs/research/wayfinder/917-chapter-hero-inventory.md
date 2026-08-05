# Inventory: chapter examples, quests, and run wiring for the home redraw

> **Wayfinder ticket:** [#917 — Chapter examples & quest inventory for the home redraw](https://github.com/SergeiGolos/wod-wiki/issues/917)
> **Map:** [#911 — Wayfinder map: Mobile home sticky-editor tour](https://github.com/SergeiGolos/wod-wiki/issues/911)
> **Date:** 2026-08-04

What each of the six language chapters provides for a home chapter hero (sticky view showing the chapter's first example + quest cards).

---

## 1. The six chapters and their first runnable example

Each chapter is a ````scroll``` canvas page (`markdown/canvas/syntax/<chapter>.md`) whose first stage carries a runnable `source:`. That source is the chapter's **first example** — the thing the home chapter hero should show and run.

| Chapter (route) | First-stage source | → resolved file | First example (content) | First stage binds quest? |
|---|---|---|---|---|
| **Basics** (`/guide/syntax/basics`) | `wods/examples/syntax/single-movement.md` | `markdown/canvas/syntax/single-movement.md` | ````time` Pushups ``demo | ✓ `basics-movement` |
| **Protocols** (`/guide/syntax/protocols`) | `wods/examples/syntax/timers-rest.md` | `markdown/canvas/syntax/timers-rest.md` | `5:00 Run`, `*:30 Rest`, `10 Burpees` | ✓ `protocols-timer` |
| **Structure** (`/guide/syntax/structure`) | `wods/examples/syntax/groups-1.md` | `markdown/canvas/syntax/groups-1.md` | `(3 Rounds)` 10/15/20 reps | ✓ `structure-rounds` |
| **Custom Metrics** (`/guide/syntax/custom-metrics`) | `wods/syntax/custom-metrics-1.md` *(note: `wods/…` not `wods/examples/…`)* | `markdown/canvas/syntax/custom-metrics-1.md` | `(5 Sets)` + `{"intensity": 80}` JSON | ✗ (bound on the *2nd* stage) |
| **Dialects** (`/guide/syntax/dialects`) | `wods/examples/syntax/dialect-wod.md` | `markdown/canvas/syntax/dialect-wod.md` | `(3 Rounds)` + `5:00 Run hard` | ✗ (bound on the *2nd* stage) |
| **Complex** (`/guide/syntax/complex`) | `wods/examples/syntax/complex-nested-protocols.md` | `markdown/canvas/syntax/complex-nested-protocols.md` | nested AMRAP + Strength | ✓ `complex-time` |

`resolveSource` (`playground/src/canvas/canvasUtils.ts`) maps both `wods/examples/<p>` and `wods/<p>` → `../../markdown/canvas/<p>`, so the two prefix styles normalize to the same `markdown/canvas/syntax/` files.

**Key finding:** four chapters bind a quest to the *first* stage; **custom-metrics and dialects do not** — their first example has no quest. For a "run the first example → satisfy the lead quest" contract, those two already need a *new* lead quest (there is nothing on the first stage to satisfy today).

## 2. Chapter quests and their validation taxonomy

All existing chapter quests are declared on the chapter page (````quest``` blocks in `markdown/canvas/syntax/<chapter>.md`) and are **content validations** (they validate what's in the editor, not a run):

| Chapter | Quests in declared order | Validation type |
|---|---|---|
| Basics | `basics-movement`, `basics-reps`, `basics-load` | `has-movement`, `has-reps`, `contains-token lb` |
| Protocols | `protocols-timer`, `protocols-rounds`, `protocols-tag` | `has-timer`, `min-rounds 3`, `contains-token AMRAP` |
| Structure | `structure-rounds`, `structure-repscheme` | `min-rounds 2`, `contains-token 21-15-9` |
| Custom Metrics | `metrics-custom`, `metrics-calc` | `contains-token rpe`, `contains-token calculate` |
| Dialects | `dialects-log`, `dialects-climb` | `contains-token ```log`, `contains-token ```log:climbing` |
| Complex | `complex-time`, `complex-rounds` | `has-timer`, `min-rounds 2` |

On the guide pages these are satisfied when the guide's editor content passes `useSyntaxChallenge.validateScriptBlock` (block-pure validator). **None of them is run-gated**, so none is currently satisfied by merely running — which is exactly why the redraw wants a new **lead "run the example" quest per chapter** (a `run-started` validation), placed first.

## 3. How the home references chapter quests and renders progress

- The home README (`markdown/canvas/home/README.md`) declares ````chapter``` blocks (order: home-tour, basics, protocols, structure, custom-metrics, dialects, complex) with a `quests:` id list and `sections: []`. A lead quest enters a chapter by (a) declaring a new ````quest` in the home README and (b) adding its id **first** in that chapter's `quests:` list.
- `TourQuests` renders chapter progress via `useChapterProgress`, which reads the localStorage quest ledger and marks a quest done if **any** page route completed it (cross-route OR). Labels come from the home quest list → `questLabels` (collected from every canvas route by `HomeView`) → a `humanize` fallback. **So adding a lead quest automatically updates chapter totals, `TourQuests`, and the header `ChallengeHeaderBadge` once it's declared and listed — no extra wiring.**
- The home `home-tour` chapter's quest rows scroll the tour runway (`onHomeQuestClick`); the six language chapters' rows link to their guide page.

## 4. Hooks and the attribution gap (the one real blocker)

- **`usePageQuests(pageRoute, quests)`** — page-scoped ledger; `markComplete(id)`.
- **`useRunStartedChallenge(pageRoute, quests, running)`** — on `running === true`, marks **every** quest in the passed list whose validation is `run-started` complete. Used on home today with the `qs-tour-timer` quest.
- **Gap:** it is all-or-nothing over the given quest list. With six chapter lead quests (all `run-started`), a run from *one* chapter hero would complete *all six* unless attribution is added — the run must know which chapter hero started it and complete only that chapter's lead quest. **This is the load-bearing question for the [Lead run-example quest schema](https://github.com/SergeiGolos/wod-wiki/issues/919) ticket.**
- Existing precedent for per-run attribution: desktop `startRun(source)` captures `playgroundSourceRef` ('hero' | 'runway'); a chapter-hero analog would need a distinct source per chapter.

## 5. Editor / runtime instance budget on home

| Surface | Live CodeMirror editors (worst case) |
|---|---|
| Desktop home (today) | hero editor + runway's `TourEditorScreen` (lazy-mounted) = **2** |
| Mobile runway (shipped #911) | **1** (hero editor in the pinned window) + timer/analytics screens (no editor) |
| Reduced-motion flat stack | **1** (hero) |

The redraw adds per-chapter heroes — up to **six more editors** if mounted eagerly. Mitigation is a redraw-architecture decision: lazily mount each chapter's editor when its section enters the viewport and unmount (or freeze) off-screen. On low-end mobile, code-editor instances are the dominant cost; the architecture ticket should set the budget explicitly (e.g. at most the greeting + the one on-screen chapter editor live at once). This is also logged as map fog (performance of N concurrent sticky editors).

## 6. Proposed lead "run the example" quest ids

| Chapter | Proposed lead quest id | Validation |
|---|---|---|
| Basics | `basics-run` | `run-started` |
| Protocols | `protocols-run` | `run-started` |
| Structure | `structure-run` | `run-started` |
| Custom Metrics | `custom-metrics-run` | `run-started` |
| Dialects | `dialects-run` | `run-started` |
| Complex | `complex-run` | `run-started` |

Each declared in the home README as a ````quest` and listed **first** in its chapter's `quests:`. Naming and the attribution mechanism are the schema ticket's to confirm — this table is a proposal for it to react to, not a decision.
