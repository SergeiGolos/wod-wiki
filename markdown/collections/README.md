---
template: canvas
---
# Workouts Home

## Frontmatter standard

**Collection / feed README** (`<slug>/README.md`):

```yaml
---
template: canvas        # required — renders this README as a canvas page
collection: true        # or `feed: true` under markdown/feeds/
category:               # required — 1–3 tags from the controlled vocabulary
  - kettlebell
---
```

**Workout file** (`<slug>/<name>.md`, or `feeds/<slug>/<date>/<name>.md`):

```yaml
---
tags:                   # required — mirrors the parent collection/feed categories
  - kettlebell
  - strength
---
```

Identity stays path-derived: collection/feed id = directory name, workout name = filename, feed date = `YYYY-MM-DD` directory. Frontmatter never repeats it. Optional overrides: `title:` (when the filename humanizes poorly), `search: hidden` (exclude from search).

Controlled category vocabulary:

| Group | Tags |
|---|---|
| Modality | `parkour` `kettlebell` `barbell` `clubs` `swimming` `unconventional` |
| Style | `crossfit` `strength` `endurance` `conditioning` |
| Context | `competition` `benchmark` `sport` `triathlon` `minimalist` |

New tags must be added here before use.
