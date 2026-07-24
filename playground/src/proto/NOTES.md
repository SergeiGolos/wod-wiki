# PROTOTYPE — throwaway. Gamified-onboarding synthesis

**Question:** do the three synthesis micro-mechanics from `docs/gamafication-poc-index.html`
— inline compiler feedback on the user's own edit, escalating hint buttons on quest
cards, and PR deltas re-annotating journal history — feel right on the real app?

**How to run:** `bun run dev:app`, then flip `?proto=today` ↔ `?proto=synthesis`
with the floating bottom switcher (arrows or ← / → keys). Switcher is dev-only.

## What was built (2026-07-22)

| Mechanic | Files | Where to see it |
|---|---|---|
| Variant switch | `proto/ProtoVariantSwitch.tsx`, mounted in `App.tsx` | every page, bottom bar |
| Inline edit feedback (`← you changed this ✓`) | `proto/editFeedback.ts`, `proto/useProtoEditFeedback.ts`; plumbing: `CanvasPanelContent.tsx` (+optional `extensions` prop), `MarkdownCanvasPage.tsx` | `/` — edit the demo workout in the sticky panel |
| First Wins shelf | `proto/ProtoFirstWins.tsx` | `/` hero, above the Goal Gradient strip |
| Hint ladder | `Quest.hints` in `parseCanvasMarkdown.ts`, reveal UI in `ChallengeCard.tsx`, content in `markdown/canvas/{home/README,syntax/basics,syntax/protocols}.md` | any incomplete quest card with hints, e.g. `qs-run` on `/` |
| PR badges | `proto/prBadges.ts`; wiring: `JournalListPage.tsx`, `JournalFeed.tsx` | `/journal` — needs ≥2 logged results with the same note name |

## Verified

- `computePrBadges` unit-checked in isolation: 11:05 → 10:20 → 9:42 yields
  `first` / `prev-best` / `new-pr (−0:38)`; slower later entries untagged.
- Parser: `hints:` lists parse on all edited markdown files.
- Browser smoke test: edit → widget within ~300 ms; revert clears it; First Edit
  tile flips; hint ladder reveals 1→3; `?proto=today` renders none of it.

## Known gaps / decisions

- PR badge render path is wired but was NOT exercised with real journal data
  (fresh browser profile has no entries). Verify with a real profile before
  promoting.
- `qs-run` still shows "Validated at runtime." status copy (pre-existing,
  flagged in the report — separate fix, not part of this prototype).
- First Run tile signal: `runtime.persistedResults.length > 0` is used for
  First Log; First Run uses timer-open state. These are honest-but-loose —
  tighten if promoted.
- `playground/vite.proto.config.ts` (HTTP-only) exists only because the
  headless test browser rejected the Tailscale cert. Delete with the prototype.

## Verdict (fill in after playing with it)

- Variant picked: ___
- Keep / change / drop per mechanic: ___
