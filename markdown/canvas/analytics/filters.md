---
search: hidden
template: canvas
route: /guide/analytics/filters
type: analytics
---

# Filters, Tags & Sources {sticky dark full-bleed}

Filters narrow down datasets across both analytics metrics and content discovery.

## Tag Filters {sticky}

Tag filters use key-value syntax inside curly braces `{}`.

| Syntax | Filter Type | Description |
|---|---|---|
| `{effort:thruster}` | Exact tag match | Filter facts or notes containing `thruster` effort |
| `{-discipline:recovery}` | Negation | Exclude recovery sessions from results |
| `{discipline:strength|gymnastics}` | OR filter | Match either `strength` OR `gymnastics` |
| `{text:fran}` | Substring match | Match content containing the phrase "fran" |

## Content Source Filters {sticky}

The `source:` filter key narrows content discovery across Catalog sources:

* `source:journal`: Personal user notes.
* `source:collection`: Preloaded Catalog sessions.
* `source:feed`: Dated Catalog posts.
* `source:collection:crossfit-girls`: Specific Catalog collection by ID.
* `!source:feed`: Exclude feed posts from universal searches.

## Time Windows {sticky}

Specify relative or absolute time ranges:

* Relative relative window syntax: `last 4w`, `last 12w`, `last 7d`.
* Custom date parameter: Panel-controlled start/end dates.

## Tri-State Source Toggles in Library {sticky}

In the unified Library (`/library`), the WQL Composer Panel uses three tri-state toggles:
1. **Note** (Journal)
2. **Session** (Catalog Collection)
3. **Post** (Catalog Feed)

Each toggle cycles through `Neutral → Include-only → Hide → Neutral`, automatically composing the underlying `find:` query and `source:` filters.

## What's Next {sticky full-bleed dark}

```button
label:  ← WQL Anatomy
target: ex
pipeline:
  - navigate: /guide/analytics/anatomy
```

```button
label:  Cross-Store Joins →
target: ex
pipeline:
  - navigate: /guide/analytics/joins
```
