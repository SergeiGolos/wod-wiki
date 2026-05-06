# Page: Feed List

**Route:** `/feed` *(planned)*
**Template:** [CalendarTemplate](../01.page-templates/calendar-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Planned (not yet implemented)

---

## Overview

The Feed List is a planned page that presents a chronological activity feed — journal entries and workout results across all collections, not limited to a single user's journal. It uses the same `CalendarTemplate` as Journal Calendar but with a different date cell renderer focused on activity summary rather than personal note editing.

The Feed is the social / aggregate view of workout activity. In a single-user deployment it serves as a richer activity timeline than the Journal Calendar.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/feed` |
| `?d=` (nuqs) | Active date. `history: 'replace'` |
| `?tags=` (nuqs) | Tag / collection filter. `history: 'replace'` |

---

## Template Overrides

| CalendarTemplate behaviour | Feed List override |
|---------------------------|-------------------|
| `leftPanel` | Collection / category filter tree |
| `contentPanel` | Chronological activity timeline (not date-strip) |
| Date cell renderer | `FeedActivityCell` — shows result summaries, not journal note titles |
| `onOpenEntry(dateKey)` | Opens a result detail or filters the feed to that day |
| `onCreateEntry` | Not applicable — feed is read-only |
| Data sources | Results + journal entries across all collections |

---

## Differences from Journal Calendar

| Feature | Journal Calendar | Feed List |
|---------|-----------------|-----------|
| Purpose | Edit personal notes | Browse activity history |
| Date cell content | Personal note title | Workout + result summary |
| Create entry | ✅ | ❌ |
| Filter | Tags | Tags + collection |
| Data scope | Personal notes + results | All results |

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Collection / tag filter tree |
| `contentHeader` | "Feed" heading + date range indicator |
| `contentPanel` | Activity timeline |
| `rightPanel` | Selected result detail (planned) |

---

## Data (Planned)

| Dataset | Source |
|---------|--------|
| Workout results | `indexedDBService.getRecentResults()` |
| Journal entries | `playgroundDB.getPagesByCategory('journal')` |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Tap result | `/review/:resultId` |
| Tap journal entry | `/journal/:dateKey` |
