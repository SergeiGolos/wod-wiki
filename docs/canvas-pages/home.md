# Home Page — `/`

**Source:** `markdown/canvas/home/README.md`  
**Frontmatter type:** `home` · **Route:** `/`  
**Template:** canvas (split-canvas: sticky prose left, live editor right)

The home page is the landing surface and the global onboarding entry point. It
contains a short hero pitch, a persistent live demo panel, a set of navigation
hubs, and three quick-start quests that complete automatically as a new user
explores the page. It also declares the six tutorial chapters whose badges are
actually earned on the `/guide/syntax/*` tutorial pages.

---

## Content covered

| Section (anchor) | Theme | What it covers |
|---|---|---|
| **WOD Wiki** (`#sticky dark full-bleed`) | dark | Hero pitch: plain-text markdown compiled into a live `WallClock` timer, then logged back to a training journal. The editor panel is **hidden** during the hero — it only appears after the user scrolls past the Jump-In hub. |
| **Jump Right In** (`#jump-in theme:sky`) | sky | Buttons that skip the tour and go straight to the journal, collections, or a new workout note. The editor panel is still hidden so the user is not pushed into the tutorial before they choose a path. |
| **Learn the Syntax** (`#learn theme:emerald`) | emerald | Buttons that either load the hero demo into the editor or navigate to the `/guide/syntax/basics` tutorial. This is the first section where the `home-demo` editor panel becomes visible and sticky. |

---

## Examples by section

### Persistent demo panel

The hero section declares a `view` named `home-demo` that stays mounted on the
right-hand side of the page for every section below it:

```yaml
name:    home-demo
state:   note
source:  wods/examples/home/welcome-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

`state: note` means the editor shows the source markdown; `runtime: in-memory`
means the WallClock is isolated and will not write a real journal entry. The
demo source is `wods/examples/home/welcome-1.md`.

### Pipeline buttons

All interaction is via `button` blocks that execute a short pipeline:

| Section | Button label | Pipeline |
|---|---|---|
| Jump Right In | `📓 Open Journal` | `navigate: /journal` |
| Jump Right In | `🗂️ Browse Collections` | `navigate: /collections` |
| Jump Right In | `✍️ New Workout Note` | `set-source: query:new`, `set-state: note`, `launch: dialog` |
| Learn the Syntax | `▾ Try the Demo` | `set-source: wods/examples/home/welcome-1.md`, `set-state: note` |
| Learn the Syntax | `🎓 Zero to Hero` | `navigate: /guide/syntax/basics` |
| What's Next | `🎓 Basics` | `navigate: /guide/syntax/basics` |
| What's Next | `🧱 Structure & Reps` | `navigate: /guide/syntax/structure` |
| What's Next | `⏱️ Timers & Protocols` | `navigate: /guide/syntax/protocols` |
| What's Next | `🧩 Complex Workouts` | `navigate: /guide/syntax/complex` |
| What's Next | `📊 Custom Metrics` | `navigate: /guide/syntax/custom-metrics` |
| What's Next | `📋 Dialects` | `navigate: /guide/syntax/dialects` |
| What's Next | `✍️ Open a New Note` | `set-source: query:new`, `set-state: note`, `launch: dialog` |

The `Try the Demo` button resets the `home-demo` panel to the welcome example.
All other `set-source` buttons open a new workout in a dialog, while navigation
buttons leave the current page for the target route.

---

## Challenges defined here

The home page declares **three quick-start quests** directly on the page, plus
**six chapter declarations** whose individual quests are completed on the
`/guide/syntax/*` tutorial pages.

### Quick-start quests (home)

| Quest id | Label | Description | Validation type |
|---|---|---|---|
| `qs-arrive` | Welcome to WOD Wiki | You landed on the playground dashboard. | mount |
| `qs-edit` | Change the workout | Make any edit to the demo script. | content-divergence |
| `qs-run` | Run it to the finish | Press Run and let the workout complete. | `workout-complete` |

### Chapter declarations (home)

| Chapter id | Badge | Quests (completed on…) |
|---|---|---|
| `basics` | trophy | `basics-movement`, `basics-reps`, `basics-load` (`/guide/syntax/basics`) |
| `structure` | blocks | `structure-rounds`, `structure-repscheme` (`/guide/syntax/structure`) |
| `protocols` | timer | `protocols-timer`, `protocols-rounds`, `protocols-tag` (`/guide/syntax/protocols`) |
| `complex` | puzzle | `complex-time`, `complex-rounds` (`/guide/syntax/complex`) |
| `custom-metrics` | activity | `metrics-custom`, `metrics-calc` (`/guide/syntax/custom-metrics`) |
| `dialects` | file-text | `dialects-log`, `dialects-climb` (`/guide/syntax/dialects`) |

The home page owns no chapter-specific badge of its own; it only registers the
chapters that contribute to the global tutorial chapter progress banner.

---

## Accomplishment when complete

### Home quick-start

Completing all three quick-start quests finishes the first-time onboarding flow
on the home page. No badge is awarded there; the page surfaces the three checks
as a lightweight, self-contained tutorial.

### Tutorial chapter badges (cross-route)

Each of the six chapter badges declared on the home page lights up when **all**
of that chapter's quest ids are marked done anywhere in the quest ledger. The
home page contributes to this progress by declaring the chapters, but the actual
quest validation happens on the `/guide/syntax/*` tutorial pages.

### Global onboarding steps (cross-route)

The home quick-start quests also map to the global first-session onboarding
steps:

| Home quest | Onboarding step | Meaning |
|---|---|---|
| `qs-arrive` | `visitedLanding` | Arrived at the playground dashboard. |
| `qs-edit` | `editedNote` | Modified markdown content in the editor. |
| `qs-run` | `ranWorkout` | Started the workout and/or ran it to completion. |

---

## How the accomplishment is measured

### Quick-start quests

- **`qs-arrive`** is completed by `useQuickStartAutoComplete` on component mount
  (or when the page first becomes visible).
- **`qs-edit`** is completed by `useQuickStartAutoComplete` when the live editor
  content diverges from the original `wods/examples/home/welcome-1.md` source —
  i.e. the user has typed, deleted, or pasted anything in the panel.
- **`qs-run`** is completed by `useCompletionChallenge` when the fullscreen
  review finishes after the workout is run to completion. The quest's
  `validation.type` is `workout-complete`, so the hook fires the completion
  event when the review overlay closes on a completed session.

All three are recorded in the same quest ledger as the tutorial quests:
`localStorage["wodwiki.quests.v1"]`, shaped as
`Record<pageRoute, Record<questId, boolean>>`.

### Chapter badges

- **Storage:** `localStorage["wodwiki.quests.v1"]`.
- **Read path:** `useChapterProgress(chapters)` reads the entire ledger and
  ORs across all routes. A quest is considered done if it is marked complete on
  any route, which is why a quest completed on `/guide/syntax/basics` lights the
  badge on `/`.
- **Chapter is "complete"** when `chapter.quests.every(isDone)`.

### Global onboarding steps

- **Storage:** `localStorage["wodwiki.onboarding.v1"]` — a set of booleans
  (`visitedLanding`, `editedNote`, `ranWorkout`, `loggedEffort`, `openedReview`).
- **Write path:** `mark(step)` at the relevant action site.
- **Step is "complete"** when its boolean is `true`.

Both stores are per-installation, cross-tab synced via `storage` events, and
scoped to onboarding/tutorial progress rather than user content.
