# Dashboards & Cookbook

> Proposed chapter 7 of 8 — see [README](./README.md). Replaces `/guide/analytics/cookbook`, the query-block half of the analytics cheat sheet, and documents the six seeded boards. Homepage: the 04-Explore captions and "Open a real dashboard" links here.

A dashboard is **just a note**: mark it `dashboard: true`, and every in-note query block becomes a widget on one grid.

## The note is the dashboard {#note-frontmatter}

````markdown
---
title: Training Block Review
dashboard: true
dashboard.weeks: 16
---

## Avg TIS
How hard are sessions?

```query:value
avg:tis{}
```

## Weekly tonnage
Is volume rising?

```query:timeseries-2
sum:totalVolume{} by {week}
```
````

Three conventions:

- The **heading above a block** is the widget title.
- The **paragraph directly above a block** is its question/subtitle.
- `dashboard.weeks`, `dashboard.intensity: [low, moderate, high]`, or any `dashboard.<name>` value in frontmatter becomes a **token control** referenced as `$name` — `$weeks`, `$intensity`. List tokens render as segmented controls; unknown token references produce a visible refusal, never a silent blank.

## Widget types and spans {#widgets}

The fence tag carries type and grid span (`query:<type>[-<1..4>|-full]`); a bare ```query defaults to `table`. Grid is 4 columns wide.

| Tag | Widget |
|---|---|
| ```query | table (default) |
| ```query:list / ```query:value | list / single big number |
| ```query:timeseries / ```query:timeseries-2 / ```query:timeseries-4 | line over time, 1/2/4 columns |
| ```query:bar / ```query:stacked-bar | bars / stacked bars |
| ```query:toplist | ranked rows |
| ```query:goal-rings / ```query:zone-distribution | progress rings / zone split |

The block body is **one WQL line** — everything from [chapter 6](./wql.md#aggregate) works, including tokens:

```query
sum:sessionLoad{intensity:$intensity} by {week}
```

Wellness data comes from a capture fence in any note — wellness keys are plain properties, one per line:

```wellness
soreness: 7
sleep: 7.5h
hrv: 62
```

Capture those daily and boards like Recovery Readiness light up ([what feeds `calc.readiness`](./metrics.md#calculated)).

## Compose, inspect, clone {#composer}

- **Vault boards** (`/dashboard/<your-note>`) are yours: add, edit, duplicate, reorder, and resize widgets in place; concurrent-edit guards refuse lost writes visibly.
- **Prebuilt boards** are read-only, but **Inspect** shows any widget's query with a live preview, and **Clone to vault** copies the whole board into your journal to edit.
- The widget composer is the same three steps for both: pick the **dataset** (a WQL line), the **calculation** (aggregator/metric/filters/window via the composer pills), and the **visualization** (type + span) — preview executes against your live journal with your range and kg/lb preferences.
- Empty journal? Widgets stay honest with a sample-data prompt instead of fake numbers.

## Cookbook {#cookbook}

Copy-paste queries (paste into a ```query block, or straight into the Explorer):

| Question | Query |
|---|---|
| Weekly strength volume | `sum:totalVolume{discipline:strength} by {week}` |
| Top volume movements | `sum:totalVolume{} by {effort}` |
| TIS trend | `avg:tis{} by {week}` |
| Acute:chronic load | `avg:calc.acwr{}` |
| Find benchmark notes | `find:note{effort:fran,source:collections}` |
| This week's swings volume | `sum:totalVolume{effort:kettlebell-swings} last 6w` |

The shared kettlebell note feeds the last row — run it, and it appears among the sample rows.

## Seeded boards {#seeded-boards}

Six real dashboard notes ship under `markdown/dashboards/` — open any of them, or Inspect → Clone:

| Board | Built around |
|---|---|
| `training-block-review` | values (`avg:tis{}`, `sum:totalVolume{}`, `avg:calc.adherence{}`), weekly volume timeseries, volume by effort toplist, stacked load by intensity/week, distance by discipline |
| `road-to-560-total` | strength PR progression toward a total |
| `polarized-base-marathon` | endurance polarization (intensity split across weeks) |
| `finger-strength-v8` | climbing: `calc.mvcBw` hang strength vs grade |
| `benchmark-pr-board` | `last:elapsed{tags:benchmark} by {effort}`, benchmark timeseries |
| `recovery-readiness` | ```wellness capture → `last:calc.readiness{}`, HRV/monotony/ACWR trends |

**Run & observe.** Open `training-block-review` in the dashboard view: every widget executes live against your journal — rows without facts badge as **sample answers until you have logged work of your own**. Inspect the *Weekly tonnage* widget, change `by {week}` to `by {day}`, and clone the board to keep your edit. Chapter 8 puts the whole language together in [full sessions](./sessions.md).
