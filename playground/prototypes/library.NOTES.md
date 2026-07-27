# Library Page — Prototype

> **Status: AWAITING VERDICT** — the three-variant exploration was narrowed to one
> WQL-style Find page. When the design is approved, fold into a real `/library` route.

## Question

A single "Library" page for non-technical users to find workouts. **Search works
like WQL** — the project's own query language — adapted from analytics-aggregation
to workout discovery.

## How to run

```bash
xdg-open playground/prototypes/library.html   # linux
open playground/prototypes/library.html        # mac
```

`⌘ /` (or `Ctrl /`) focuses the query field. Toggle light/dark with the nav icon.

## What it does

The search bar accepts WQL-style tokens, plain words, or a mix:

```
type:amrap dur:<15 tag:bodyweight not tag:barbell fran
```

- **`key:value`** filters: `type:`, `tag:`, `collection:`, `feed:`, `diff:`, `dur:`
- **Range ops** ride inside the value: `dur:<15`, `dur:>=20`, `dur:15..30`
- **OR sets**: `type:amrap|emom`
- **Negation**: bare `not` (carries to next token), `not:` prefix, or `-`
- **Freeform**: any bare word matches name / preview / tags
- **Aliases**: `duration`→`dur`, `difficulty`→`diff`, `col`→`collection`, `equip`→`tag`

### The WQL borrowings (from `WqlQueryComposer`)

The dual-view model from the analytics composer, ported to discovery:

1. **Code ↔ Pills, bidirectional** — type in the WQL field, visual IS/NOT pills
   build up; remove a pill, the code re-serializes. Both stay in sync.
2. **Live human-translation banner** — restates the query in plain English as you
   type ("Showing workouts with tag bodyweight, limited to 20 min or less and
   without difficulty Advanced."). Same affordance as `WqlHumanTranslationBanner`.
3. **Facets write tokens** — clicking a facet in the left rail adds a token to the
   query (and thus to the code + pills + translation). The facets *are* the query,
   not a parallel filter system.
4. **Quick-add suggestions** — context-aware chips (`+type:amrap`, `+dur:<15`)
   that disappear once their key is used.

### Why this shape for non-technical users

- They never see raw WQL unless they want to — the pills + translation do the
  talking. But the power is there: a coach can paste a query string and share it.
- The colon grammar is forgiving — `type amrap` (no colon) just becomes a freeform
  search for "type amrap", it doesn't error. Progressive disclosure.
- Difficulty is a colored dot, type is a metric-colored badge (same hues the
  runtime uses), duration is a number. Minimal vocabulary.

## Scrapped variants (for the record)

The first round explored three structures; B won and absorbed the best of the others:

| Key | Name | Why kept / dropped |
|-----|------|--------------------|
| A | Discover (shelves) | Dropped — browse-first hides search, which is the primary intent |
| **B** | **Find (faceted)** | **Kept → evolved into the WQL-style page above** |
| C | Stream (river) | Dropped — recency-first is the Journal's job, not the Library's |

## Verdict

<!-- Fill in once approved: -->
Decision:
Next step:
