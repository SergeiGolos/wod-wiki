# Handoff — decompose `App.tsx` (Finding 02)

> Paste-ready brief for a fresh implementation session. Self-contained: every
> decision, contract, and gate is named here or in the linked artifacts. Do not
> re-derive the design — the decomposition is settled.

---

## Your objective

Implement **Finding 02**: decompose `playground/src/App.tsx` (680 ln, 99.9th-%ile
churn — the single highest-churn file in the repository) so `AppContent` becomes
a **routing + layout composition**, with its cohesive responsibilities pulled
behind their own seams. The biggest win is **deduplication**, not just extraction:
the workout-index and the journal-entry flow are copy-pasted across siblings.

## Read first (grounding — do not skip)

1. [`docs/findings/02-playground-app-god-component.md`](./02-playground-app-god-component.md)
   — the finding (responsibilities, deletion test, evidence).
2. [`docs/findings/01-implementation-handoff.md`](./01-implementation-handoff.md)
   — for the `NavigationIntent` context (02 and 01 share the router; see the
   contract below, which corrects an overclaim in the 01 brief).
3. [`docs/findings/06-dead-code-cleanup.md`](./06-dead-code-cleanup.md) — the
   `CommandProvider` mounted in `App.tsx:11` is a **no-op** (0 readers); resolve
   it as part of the provider-stack refactor.
4. [`CONTEXT.md`](../../CONTEXT.md) — domain vocabulary.

## Decisions already made — do not re-litigate

- **Pure module + hook, keep props.** The workout-index logic (the
  `import.meta.glob` + the 30-line front-matter shaping) becomes a **pure module**
  + a `useWorkoutItems()` hook. `App.tsx` and `PlaygroundLandingPage.tsx` both
  call the hook. **Leaf components still receive `workoutItems` as a prop** —
  their injected-data tests (`MarkdownCanvasPage.test.tsx:277` etc.) keep working
  unchanged. Do NOT couple leaf components to the glob.
- **Three cohesive extractions**, in this order:
  1. `workoutIndex` — the deduped index (see below).
  2. `useCreateJournalEntry` — the deduped journal-entry flow (today triplicated
     in `App.tsx`/`ListViews.tsx`/`PlanPage.tsx`).
  3. `usePageScrollSync` — the `IntersectionObserver` scroll-spy + the DOM /
     CodeMirror dual-path `scrollToSection` + NavContext registration.
- **Consolidate the feed regexes** (`feedItemMatch` / `feedDetailMatch`,
  `App.tsx:122-123`) into the existing `./lib/routes` (which already holds
  `isPlaygroundNotePath`, `isJournalEntryPath`, etc.). Do not create a parallel
  route module.
- **`AppContent` keeps:** the provider stack, the route table (the page-tree
  ternary — this *is* routing), the layout shell (`SidebarLayout` + `Navbar` +
  `NavSidebar`), and the orchestration that wires `currentNavLinks` → scroll-spy
  → `NavContext`. Everything else moves out.

## Module shapes

- **`playground/src/lib/workoutIndex.ts`** (new) — exports:
  - `workoutFiles` — the `import.meta.glob('../../markdown/**/*.md', …)` constant
    (moved from `App.tsx:95`).
  - `WorkoutItem` — the type (moved from `App.tsx:98-105`; update the import sites
    that currently import it from `App`).
  - `buildWorkoutItems(files): WorkoutItem[]` — the pure front-matter shaping
    (moved from the `useMemo` at `App.tsx:125-157` / `PlaygroundLandingPage.tsx:106`).
  - `useWorkoutItems(): WorkoutItem[]` — `useMemo(() => buildWorkoutItems(workoutFiles), [])`.
- **`playground/src/hooks/useCreateJournalEntry.ts`** (new) — wraps
  `createJournalEntryFlow` + `playgroundDB.savePage` + `navigate`. Returns a
  `createEntry(date: Date)` callback. Replaces the bodies at `App.tsx:318-333`,
  `ListViews.tsx:194-209`, `PlanPage.tsx:153-168`.
- **`playground/src/hooks/usePageScrollSync.ts`** (new) — owns the
  `IntersectionObserver` (`App.tsx:450-471`), the `scrollToSection` DOM+CodeMirror
  dual path (`App.tsx:384-442`), the `editorViewRef`/`handleViewCreated` pair, and
  the `registerScrollFn` + `setL3Items` NavContext wiring (`App.tsx:444-476`).
  Takes `currentNavLinks` + the nav dispatch as input.

## Cross-finding contracts you MUST preserve

| Boundary                        | Contract                                                                                                                                                                                                                                                                 | Action                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **02 → 04 (canvas) + siblings** | `workoutItems` + `wodFiles` stay **props** to `MarkdownCanvasPage`, `JournalWeeklyPage`, `PlanPage`, `CollectionWorkoutsList`, `globalSearchSource`.                                                                                                                     | **04 is insulated** — it keeps receiving the same props; only the *source* changes (inline memo → hook). Do not change any leaf component's prop interface. Keep `WorkoutItem` field-compatible.                  |
| **02 ↔ 01 (Workbench Session)** | Coexist in one `react-router`. App.tsx does **path-level** routing; 01 does **view-level** navigation. **Weak coupling** — they do not exchange nav intents today. *(The 01 handoff overclaimed "02 consumes NavigationIntent"; in fact 02's shell routing is simpler.)* | Don't invent a divergent route vocabulary. If you extract anything nav-shaped, keep it consistent with `./lib/routes`, not a new scheme.                                                                          |
| **02 ↔ 06 (CommandContext)**    | `App.tsx:11` mounts `CommandProvider`, which Finding 06 shows is a **no-op** (0 readers, empty command list).                                                                                                                                                            | When you touch the provider stack, **resolve** CommandContext per Finding 06 (drop it, or wire it) — do not silently carry a dead provider into the new structure. Confirm with the product question in 06 first. |
| **02 ↔ 05 (Cast)**              | `<CastButtonRpc />` in the navbar (`App.tsx:506`).                                                                                                                                                                                                                       | Trivial — keep mounting the button. Cast bridges live in the workbench tree, not App.                                                                                                                             |

## Implementation steps — green between each (`bun run test`)

**Step 1 — `workoutIndex` module (highest value: dedup).** Create
`lib/workoutIndex.ts` with `workoutFiles`, `WorkoutItem`, `buildWorkoutItems`,
`useWorkoutItems`. Replace the inline glob + `useMemo` in `App.tsx` and
`PlaygroundLandingPage.tsx` with `useWorkoutItems()`. Move the `WorkoutItem` type
and update its import sites. Verify leaf components still receive `workoutItems`
as props (unchanged). Build green.

**Step 2 — `useCreateJournalEntry` hook.** Extract the triplicated body;
`App.tsx`, `ListViews.tsx`, `PlanPage.tsx` call the hook. Build green.

**Step 3 — `usePageScrollSync` hook.** Move the `IntersectionObserver`, the
`scrollToSection` dual path, `editorViewRef`/`handleViewCreated`, and the
NavContext registration into the hook. `AppContent` calls it with
`currentNavLinks` + nav dispatch. Verify scroll-spy + L3 sync + editor scroll
still behave on canvas, docs, and editor routes. Build green.

**Step 4 — consolidate feed regexes** into `./lib/routes`. Replace
`feedItemMatch`/`feedDetailMatch` inline regexes with helpers from `lib/routes`.
Build green.

**Step 5 — slim `AppContent`.** With the three responsibilities extracted,
`AppContent` should read as: provider stack → route table → layout shell →
nav-links/scroll-spy wiring + search-palette wiring. Confirm the file no longer
holds the index, journal-entry, or scroll-spy logic. Resolve the `CommandProvider`
per Finding 06. Build green.

## Definition of done

- `bun run test ./src` green — no new failures beyond the documented baseline.
- `bun x tsc --noEmit` clean on the touched surface (esp. `WorkoutItem` import
  moves).
- `bunx vite build --config playground/vite.config.ts` succeeds.
- Storybook still builds (canvas/workbench stories unaffected).
- `App.tsx` line count drops materially; it holds only routing + layout +
  shell orchestration.
- **No leaf component's prop interface changed** (04 + siblings insulated).
- The workout-index logic exists in **exactly one place** (`workoutIndex.ts`);
  same for the journal-entry flow (one hook).
- The `CommandProvider` dead-mount is resolved per Finding 06.

## Baseline (2026-06-20)

- `bun test ./src` — 2820 pass / 1 fail (pre-existing `AggregateError` in
  `assertions.test.test.ts`; not yours).
- Playground build succeeds.
- Storybook — 55 files / 212 tests pass.

## Out of scope (separate findings)

- **Finding 01** (Workbench Session) — different tree (`src/` library). 02 shares
  only the router.
- **Finding 04** (MarkdownCanvasPage) — insulated by the keep-props decision; do
  not touch it.
- **Finding 03** (ScriptRuntime), **05** (cast receiver), **06** (dead code) —
  untouched, except 02 resolves the one `CommandProvider` mount per 06.

## Risks to respect

- `App.tsx` is the repo's #1 churn hotspot (86 commits). Extract one
  responsibility at a time, build green between each — same discipline as the
  Workbench Session migration.
- The `WorkoutItem` type move has a blast radius (multiple import sites). Let
  `tsc --noEmit` find them; don't hand-update blindly.
- The scroll-spy `IntersectionObserver` + the CodeMirror scroll path have
  finicky timing (`scrollMarginTop` restore, `requestAnimationFrame`). Move them
  verbatim first; verify behavior on canvas/docs/editor routes before any cleanup.
- Do not let the workout-index extraction drift into a "singleton + direct
  import" shape — that breaks leaf-component tests. The decision is **pure module
  + hook, props preserved**.
