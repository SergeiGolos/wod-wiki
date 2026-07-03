# Versioned Block Identity — UI Proposal (Finalized)

## Three Visual States

### State 1 — Current results exist (common case for run blocks)

```
┌─────────────────────────────────────────┐
│  ```wod                                 │
│  21-15-9                                │
│  Thrusters 95lb                         │
│  ```                                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ● v2 · 1 result        ▾ History │   │  ← header only if >1 version
│  │─────────────────────────────────│   │
│  │ ▸ 4:12 · Today, 2:30 PM  [chips]│   │  ← full ResultRow
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Single-version blocks (the majority) skip the header — straight from separator to ResultRows:

```
│  ┌─────────────────────────────────┐   │
│  │─────────────────────────────────│   │  ← separator only
│  │ ▸ 4:12 · Today, 2:30 PM  [chips]│   │
│  └─────────────────────────────────┘   │
```

### State 2 — Edited block, no current results, history exists

```
│  ┌─────────────────────────────────┐   │
│  │ ○ No results · ▾ 1 previous     │   │  ← minimal bar, gray dot
│  └─────────────────────────────────┘   │
```

Expanding the toggle:

```
│  ┌─────────────────────────────────┐   │
│  │ ○ No results · ▴ Hide           │   │
│  │─────────────────────────────────│   │
│  │ Previous Versions               │   │
│  │ ┌ v1 · Fran (original) ───────┐ │   │
│  │ │ 21-15-9 Thrusters Pull-ups   │ │   │  ← content preview
│  │ │ ▸ 3:47 · 2 days ago          │ │   │  ← result summary
│  │ └──────────────────────────────┘ │   │
│  └─────────────────────────────────┘   │
```

### State 3 — Never run (majority of blocks)

No results bar at all. Just the ```wod fence with its existing styling. No badge, no version concept.

## Header (multi-version only)

Shown when `history.size > 0` (more than one contentId generation exists for this blockId).

```
─────────────────────────────────────
 ● v2 · 1 result          ▾ History
─────────────────────────────────────
```

| Element | Style |
|---------|-------|
| `●` green dot | Results exist for current version |
| `○` gray dot | No current-version results (State 2) |
| `v2` | Version number, `text-xs font-semibold text-muted-foreground` |
| `1 result` | Count, `text-xs text-muted-foreground` |
| `▾ History` / `▴ Hide` | Toggle, `text-xs text-primary cursor-pointer` |

## History Panel (inline push-down)

Expands below current results when `▾ History` is clicked. Local state — collapses on scroll-away.

### Previous version entries (compact cards)

Each entry shows:
- **Version tag**: `v1` in `text-xs font-semibold text-muted-foreground`
- **Content preview**: first line of the WOD content at that version, `text-xs text-muted-foreground/70 truncate`
- **Result summary**: duration + date, same format as ResultRow collapsed header
- NOT a full expandable ResultRow — no analytics scorecard, no metric chips

```
 Previous Versions
 ┌ v1 · Fran (original) ───────────────┐
 │ 21-15-9 Thrusters Pull-ups           │  ← content preview (first line)
 │ ▸ 3:47 · 2 days ago    ▸ 3:52 · 3d   │  ← result summaries (inline)
 └──────────────────────────────────────┘
```

Multiple results within a version show inline (not stacked rows):

```
 ┌ v1 · Fran (original) ───────────────┐
 │ 21-15-9 Thrusters Pull-ups           │
 │ ▸ 3:47 · 2 days ago  ▸ 3:52 · 3d    │  ← two results, same version
 └──────────────────────────────────────┘
```

**Mobile:** limit visible history entries to 3, with `+ N more` expandable.

## Component Changes

### `InlineResultPanel.tsx`

```ts
interface InlineResultPanelProps {
  sectionId: string;
  results: WorkoutResult[];                    // current-version results
  allVersionResults?: Map<number, {            // NEW — for history toggle
    contentId: string;
    results: WorkoutResult[];
  }>;
  currentVersion: number;                      // NEW — for badge
  onOpenReview: (result: WorkoutResult) => void;
}
```

**Rendering logic:**
1. If `allVersionResults && allVersionResults.size > 1`: render header with version badge + toggle
2. If `results.length > 0`: render ResultRows for current version
3. If `results.length === 0 && allVersionResults?.size > 0`: render minimal bar (State 2)
4. If `showHistory`: render compact cards for each previous version

### `ReactResultsWidget` (`whiteboard-results-widget.ts`)

Constructor gains `currentVersion` and `allVersionResults` from the decoration builder. `eq()` includes version in equality check.

### `_buildResultsDecorations`

Filter widens from `r.blockContentId === section.contentId` to `r.blockId === section.id`. The widget receives ALL results for the block; `InlineResultPanel` splits current vs history.

### `groupResultsByVersion()` (new pure function)

Called in `_buildResultsDecorations` to split results into current + history before passing to the widget.

## Visual Language

- **Version badge**: same weight as timestamp. `bg-muted`, `text-xs`. Not prominent.
- **Previous version cards**: `opacity-80`, thin divider between entries. Clearly "archived."
- **Gray dot (○)**: muted, signals "edited, no current results." Not alarming.
- **Green dot (●)**: existing semantic — results present.
- **History toggle**: `text-primary` link, not a button. Subtle.

## Interaction States

| User action | What happens |
|-------------|-------------|
| Run workout first time | Result saved on v1. Bar: separator + ResultRow (no header, single version) |
| Run again (same content) | Result saved on v1. Bar: separator + 2 ResultRows (still no header) |
| Edit block content | Bar changes to State 2: `○ No results · ▾ 1 previous` |
| Click `▾ History` | History panel expands inline. Shows v1 compact card with results. |
| Run edited workout | Result saved on v2. Bar: `● v2 · 1 result ▾ History` + ResultRow |
| Undo edit (content reverts) | contentId matches v1 again. Bar: separator + ResultRows (v1 results visible). Header may appear if v2 results exist. |
| Click previous version card | (Future) could expand to full ResultRow with analytics. For v1: just shows summary. |
