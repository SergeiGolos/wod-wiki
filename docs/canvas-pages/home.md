# Home Page — `/`

**Source:** `markdown/canvas/home/README.md`
**Frontmatter type:** `home` · **Route:** `/`
**Template:** canvas (split-canvas: sticky prose left, live editor right)

The home page is the landing surface and the master interactive walkthrough.
It owns the **chapter declarations** that the onboarding progress banner reads
to unlock badges, but it ships **no quests of its own** — the quests for each
chapter are completed on the dedicated chapter pages.

---

## Content covered

| Section (anchor) | Theme | What it teaches |
|---|---|---|
| **Title — "WOD Wiki"** (`#sticky dark full-bleed`) | dark | The pitch: plain-text markdown compiled into a live `WallClock` timer, logged back to a journal. Defines the three pillars (Markdown · Execute · Wiki). Carries the hero carousel and the persistent `home-demo` editor panel. |
| **The Whiteboard Script** (`#statement`) | violet | The plan→run→analytics loop on a live block. Sub-steps **1·Plan**, **2·Run**, **3·Analytics** explain editing, firing the WallClock, and where the result lands (Date · Effort · Reps · Volume · MET-min · TIS). |
| **Metrics** (`#metrics`, `density:compact`) | emerald | Three measurement types a movement can carry: reps, load, distance. |
| **Timers** (`#timer`) | amber | Prefixing a movement with a duration (`:30`, `5:00`, `1:30:00`) runs a countdown. |
| **Groups** (`#groups`) | sky | `(N Rounds)` headers + indentation repeat a block. |
| **Protocols** (`#protocols`) | rose | AMRAP / time-cap framing. |
| **Own Your Data** (`#data`) | sky | Local-first, open-source, plain-markdown-files positioning. |
| **Custom Dialects** (`#dialects`) | rose | `wod` / `log` fence types; author your own dialect. |
| **What's Next** (`#full-bleed dark`) | dark | Navigation hub: Zero-to-Hero guide, the three chapter links, GitHub. |

---

## Examples by section

The home page uses **two example mechanisms**:

1. **`example` blocks → tabbed example picker (`ExampleTabs`).**
   Only the **Metrics** section uses these — three labelled tabs, each loading a
   different source into the editor:
   - `Reps only` → `wods/examples/getting-started/metrics-1.md`
   - `With weight` → `wods/examples/getting-started/metrics-2.md`
   - `With distance` → `wods/examples/getting-started/metrics-3.md`

2. **`command` blocks → one-shot source swap into the `home-demo` panel.**
   Timers, Groups, Protocols, and Custom Dialects each fire a `command` whose
   pipeline does `set-source: <path>` (+ optionally `set-state: note`) so the
   right-hand editor shows that section's canonical example. Scrolling back up
   restores the earlier owner (`resolveContentOwners` maps each section to the
   nearest earlier section that owns content).

3. **`view` block — the persistent panel.**
   `home-demo` is declared once at the top (`source: wods/examples/home/welcome-1.md`,
   `runtime: in-memory`, `launch: host`, aligned right at 45%). Every section's
   command targets `home-demo` by name.

4. **`button` blocks → pipeline actions.** "Try It →" buttons flip the panel to
   `set-state: track` (start the timer); "Explore Full Syntax →" buttons
   `navigate` to another route.

---

## Challenges defined here

**None directly.** The home page declares **chapters**, not quests. Quests live
on the chapter pages (`/chapters/*`). The three chapter blocks at the top of the
file wire home-page **sections** to **quest ids** that are completed elsewhere:

| Chapter | Badge | Quest ids (completed on…) | Home sections it claims |
|---|---|---|---|
| `basics` | trophy | `basics-movement`, `basics-reps` (→ `/chapters/basics`) | `[statement, metrics]` |
| `sequences` | dumbbell | `sequences-timer`, `sequences-rounds` (→ `/chapters/sequences`) | `[timers, groups]` |
| `protocols` | timer | `protocols-rounds`, `protocols-tag` (→ `/chapters/protocols`) | `[protocols, dialects]` |

The `sections` field is a visual grouping hint; the `quests` field is what
drives badge completion.

---

## Accomplishment when complete

Two independent progress systems surface on the home page's header
(`OnboardingBanner`, rendered in the `CanvasEditorPanel` header-actions slot
when `page.chapters` is non-empty):

### 1. Chapter badges (cross-route)
Each chapter's icon badge (🏆 trophy / 🏋️ dumbbell / ⏱️ timer) lights up in the
banner when **all** of its quest ids are marked done **anywhere** in the ledger.
A chapter row shows `completedCount / totalCount` and "Chapter complete." when
fully done.

### 2. Five-step first-session onboarding (global)
A separate linear checklist, marked at action sites across the app:

| # | Step key | Meaning |
|---|---|---|
| 1 | `visitedLanding` | Arrived at the playground dashboard (auto-marked on mount). |
| 2 | `editedNote` | Modified markdown content. |
| 3 | `ranWorkout` | Started compiling / ran the timer. |
| 4 | `loggedEffort` | Saved completed-workout data. |
| 5 | `openedReview` | Opened the review grid. |

---

## How the accomplishment is measured

### Chapter badges
- **Storage:** `localStorage["wodwiki.quests.v1"]` — a ledger shaped as
  `Record<pageRoute, Record<questId, boolean>>`.
- **Write path:** `usePageQuests` (on the owning chapter page) calls
  `markQuestComplete(pageRoute, questId)` — idempotent / monotonic in production.
- **Read path:** `useChapterProgress(chapters)` reads the **entire** ledger once
  and ORs across all routes (`isDone(questId)` returns true if *any* route has
  it). This is why a quest completed on `/chapters/basics` lights the badge on
  `/`.
- **Chapter is "complete"** when `chapter.questIds.every(isDone)`.

### Onboarding steps
- **Storage:** `localStorage["wodwiki.onboarding.v1"]` — five booleans
  (`visitedLanding`, `editedNote`, `ranWorkout`, `loggedEffort`, `openedReview`).
- **Write path:** `mark(step)` at the relevant action site.
- **Step is "complete"** when its boolean is `true`. Unknown/removed keys coerce
  to `false`, so the set can change across versions with no migration.

Both stores are per-installation, cross-tab synced via `storage` events, and
disposable (not user content).
