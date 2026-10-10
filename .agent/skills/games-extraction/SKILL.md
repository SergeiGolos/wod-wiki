---
name: games-extraction
description: Extract a year's CrossFit Games individual events from the web into markdown/collections/crossfit-games. Use when adding Games events for a year — "pull the 2017 Games events", "extract 2016 CrossFit Games", or extending the collection backward.
license: MIT
---

# Games Extraction — Archiving CrossFit Games Events

Pull one year of individual-division CrossFit Games events into the wod-wiki collection. Scope is **individual events only** — teams, masters, and teens are out of scope.

Syntax conversion rules (rounds, `?` placeholders, AMRAP/EMOM shapes) live in `wod-extraction`; reach for it when an event shape is not covered below. This skill owns the workflow and file conventions.

## Steps

### 1. Research the year

Pull the event list from the official page: `https://games.crossfit.com/workouts/games/<year>` (individuals tab). It carries dates, time caps, loads, and cut lines. Pre-2014 archive pages may have broken day tabs and unnumbered events — use Wikipedia's day-grouped event sections to establish competition order and numbering instead. If a read returns truncated event detail, re-source from `https://en.wikipedia.org/wiki/<year>_CrossFit_Games` — do not retry pagination.

Build the inventory before writing anything. One row per **separately scored** event (e.g. 2019 Ringer 1 and Ringer 2 are two events → 12 for that year): event number, official name, date, format, time cap, cut after.

### 2. Fix dates and filenames

- Filename: `YYYY-MM-DD-event-NN.md` — events sharing a competition day share the date; `NN` is the event number.
- Frontmatter `date:` matches the filename date.
- Verify the weekday against the real calendar; the `Date:` line reads `August 1, 2019 (Day 1 - Thursday)` — day-of-week mistakes here are the most common error.

### 3. Write the event files

One file per event, template below. Conventions:

- **Men's Rx load goes in the `time` block**; the Scaling table carries both (Men / Women rows). Loads in lb, KBs in kg.
- **Description** is one sentence naming the movements and structure ("Pegboard, double-unders, and dumbbell hang work for 5 rounds.").
- **Breakdown** bullets: Modality, Time Domain (state the cap: "Moderate, 20-minute cap"), Primary Movements, Intensity, and Skill Level only for skill-heavy events (rope climbs, muscle-ups, handstand work, pistols).
- **Collectible Metrics** by format: for-time → Time; AMRAP → Reps; max-weight → Weight.

### 4. Validate every `time` block

All blocks must parse with zero errors. Run a throwaway script **at the repo root** (workspace packages do not resolve from `/tmp` or other dirs):

````js
// check-<year>.tmp.mjs — run with `node ./check-<year>.tmp.mjs`, delete after
import { createParser } from '@bitcobblers/wod-wiki-lang';
import { readFileSync, readdirSync } from 'node:fs';
const dir = 'markdown/collections/crossfit-games';
for (const f of readdirSync(dir).filter((f) => f.startsWith('<year>-'))) {
  const md = readFileSync(`${dir}/${f}`, 'utf8');
  for (const m of md.matchAll(/```time\n([\s\S]*?)```/g)) {
    const errs = createParser().read(m[1], 'crossfit').errors ?? [];
    if (errs.length) { console.log(`${f}: ${errs.map(e => e.message).join('; ')}`); process.exitCode = 1; }
  }
}
````

The `wod` CLI (`packages/engine`) parses raw script only — not fenced markdown — so it is not the validation path here.

### 5. Update the README

Bump `N events from the <first>–<last> CrossFit Games.` to the new totals.

## Format → Syntax Map

| Format (frontmatter) | Shape | `time` block |
|---|---|---|
| `for-time` | Chipper / straight list | one movement per line, no header |
| `for-time` | N rounds | `(N)` header, children indented 2 |
| `for-time` | Descending reps, 2 movements | `(30-20-10) Movement A / Movement B` |
| `amrap` | Fixed window | `20:00 AMRAP` + indented movements |
| `max-weight` | Ladder or single | `1 Clean ?lb` (weight is the collectible) |
| `max-reps` | Fixed window | `5:00 ? Handstand Pushups` |

Frontmatter format spellings already in the collection: `for-time`, `amrap`, `max-weight`, `max-reps` (legacy files also carry `for-max-weight` and `progressive-ladder` — write the dominant spelling, do not churn old files).

## File Template

```markdown
---
date: YYYY-MM-DD
domain: crossfit
format: for-time
intent: competition
---

# YYYY CrossFit Games - Event N "Official Name"

**Location:** <venue, city, state>
**Date:** Month D, YYYY (Day N - Weekday)

## Description

<one-sentence structure summary>

```time
<whiteboard script>
```

## Scaling

| Level | <Movement> |
|-------|------------|
| Men | ... |
| Women | ... |

## Breakdown

- **Modality:** ...
- **Time Domain:** ..., <N>-minute cap
- **Primary Movements:** ...
- **Intensity:** ...

## Collectible Metrics

- **Time:** Total time to complete
```
