# WOD Wiki — Page Type Inventory

**Date:** 2026-05-15
**Method:** Live exploratory QA of https://wod.wiki
**Purpose:** Catalog all distinct page types and document their shared elements, unique elements, and structural relationships.

---

## Page Types Identified

The app has **7 distinct page types** organized into 3 tiers: top-level navigation pages, drill-down detail pages, and overlay/modal views.

### Tier 1: Navigation List Pages (5)

These are the top-level destinations accessible via the main nav bar.

#### 1. Playground (Home)
- **URL:** `https://wod.wiki/` (root)
- **Sidebar:** SYNTAX docs section (6 buttons: Zero to Hero, Syntax Reference, Core Concepts, Complex Workouts, Timers & Protocols, Structure & Rep Schemes)
- **Heading:** "Playground -- <date + time>"
- **Header actions:** New, Reset to default, Search, Cast to TV, connecting status
- **Content:** Rich-text editor (textbox) with embedded ```wod code blocks rendered inline
- **Inline actions:** "Run Workout" button, "New Note" button (appear inline after wod blocks)
- **Bottom action bar:** Play, Share, Today, Schedule
- **Character:** Freeform scratchpad; editable; not persisted to journal

#### 2. Journal
- **URL:** Navigated via nav button
- **Sidebar:** Calendar (month picker with day buttons), TAGS section (strength, cardio, mobility, kettlebell, swim)
- **Heading:** "Journal"
- **Header actions:** Search, Cast to TV
- **Content:** Date-grouped list of journal entries (shows date label + entry cards). When empty for a date, shows "Start today's journal entry" button.
- **Entry creation:** Opens Command Palette modal with 5 options (Blank, Collection, Feed, History, Template-coming-soon)
- **Character:** Date-scoped personal log; the primary "write here" destination

#### 3. Plan
- **URL:** Navigated via nav button
- **Sidebar:** Calendar (month picker), TAGS section (same as Journal: strength, cardio, mobility, kettlebell, swim)
- **Heading:** "Plan"
- **Header actions:** Search, Cast to TV
- **Content:** Date-grouped list showing upcoming dates with entry cards or "Create journal entry" buttons. Shows ~2 weeks ahead from today.
- **Entry creation:** Same Command Palette as Journal (Blank, Collection, Feed, History, Template)
- **Character:** Forward-looking planning view; structurally similar to Journal but future-oriented

#### 4. Feeds
- **URL:** Navigated via nav button
- **Sidebar:** Calendar (month picker, days with entries are labeled "has entries"), FEEDS section (Crossfit Programming, Dan John 40 Day)
- **Heading:** (none at list level -- date groups with feed entry cards)
- **Header actions:** (none visible at list level)
- **Content:** Chronological list of feed entries grouped by date. Each card shows: type badge ("WOD"), title, feed source name, "TODAY" button
- **Character:** External/public feed viewer; read-only browsing of syndicated programming

#### 5. Collections
- **URL:** Navigated via nav button
- **Sidebar:** CATEGORY filters (Benchmark, Cardio, Clubs, Competition, Crossfit, Endurance, Kettlebell, Sport, Strength, Swimming, Triathlon, Unconventional)
- **Heading:** "Collections"
- **Header actions:** Search, Cast to TV, filter textbox
- **Content:** List of collection cards. Each card shows: collection name (h3), workout count ("N workouts"), category tags
- **Character:** Library/encyclopedia of curated workout collections; browsable, filterable

### Tier 2: Detail/Editor Pages (4)

These are reached by clicking items in the list pages above.

#### 6. Note/Entry Editor Page (shared template)
- **Used by:** Journal entries, Feed entries, Collection workouts
- **Sidebar:** Varies by context:
  - Journal entry: Calendar + TAGS (same as Journal page)
  - Feed entry detail: Calendar (days with entries labeled) + breadcrumb nav (feed name, entry title) + ALL SESSIONS list
  - Collection workout detail: CATEGORY filter list + COLLECTION breadcrumb + workout list (Event 01-11)
- **Heading:** Entry title (h1)
- **Header actions:** Search, Cast to TV
- **Content:** Rich-text editor (textbox) with markdown content including ```wod code blocks
- **Bottom action bar (Journal entry):** Play, Share, Schedule
- **Bottom action bar (Feed/Collection entry):** Play, Playground, Share, Schedule
- **Character:** The universal content viewing/editing surface. Same template, different sidebar context.

#### 7. Syntax Doc Page
- **Used by:** Zero to Hero, and presumably other syntax docs
- **Sidebar:** SYNTAX section (same 6 buttons as Playground)
- **Heading:** Doc title (h1)
- **Header actions:** Search, Cast to TV
- **Content:** Numbered tutorial steps with "TRY THIS -->" buttons, embedded ```wod editor blocks, prose explanations
- **Right panel:** Small editor textbox for live code experimentation
- **Character:** Educational/ tutorial content with interactive code blocks

### Tier 3: Overlays/Modals (2)

#### 8. Command Palette
- **Trigger:** "Start today's journal entry" / "Create journal entry" buttons on Journal/Plan pages
- **Content:** Search textbox + listbox with 5 options:
  1. Blank -- "Empty entry with a workout block ready to fill in"
  2. Collection -- "Drill into a collection -> pick a workout -> clone a WOD block"
  3. Feed -- "Pick a recent entry from your feed and clone a WOD block"
  4. History -- "Copy the full content of a past journal entry"
  5. Template -- "Coming soon -- saved note templates"
- **Character:** Entry creation launcher; navigates to Note/Entry Editor on selection

#### 9. Global Search
- **Trigger:** Search button (cmd+/) present on most pages
- **Character:** Not fully explored; present on all pages

---

## Structural Comparison Matrix

### Shared Elements (Present on ALL pages)

| Element | Details |
|---------|---------|
| Top nav bar | Home, Journal, Plan, Feeds, Collections (always visible) |
| Version badge | "V 0.5.2" in nav |
| Search button | cmd+/ shortcut on most pages |
| Notifications tray | F8 to open |

### Sidebar Variations

| Page Type | Calendar | Tags | Categories | Feeds List | Collection Nav | Syntax Nav |
|-----------|----------|------|------------|------------|----------------|------------|
| Playground | -- | -- | -- | -- | -- | YES (6 docs) |
| Journal | YES | YES (5 tags) | -- | -- | -- | -- |
| Plan | YES | YES (5 tags) | -- | -- | -- | -- |
| Feeds | YES | -- | -- | YES (2 feeds) | -- | -- |
| Collections | -- | -- | YES (12 categories) | -- | -- | -- |
| Note Editor (Journal) | YES | YES (5 tags) | -- | -- | -- | -- |
| Note Editor (Feed) | YES | -- | -- | YES | YES (sessions) | -- |
| Note Editor (Collection) | -- | -- | YES | -- | YES (events) | -- |
| Syntax Doc | -- | -- | -- | -- | -- | YES (6 docs) |

### Header Actions

| Page Type | Search | Cast to TV | New | Reset | Filter |
|-----------|--------|------------|-----|-------|--------|
| Playground | YES | YES | YES | YES | -- |
| Journal | YES | YES | -- | -- | -- |
| Plan | YES | YES | -- | -- | -- |
| Feeds | -- | -- | -- | -- | -- |
| Collections | YES | YES | -- | -- | YES |
| Note Editor | YES | YES | -- | -- | -- |
| Syntax Doc | YES | YES | -- | -- | -- |

### Bottom Action Bar

| Page Type | Play | Playground | Share | Schedule | Today |
|-----------|------|------------|-------|----------|-------|
| Playground | -- | -- | YES | -- | YES |
| Journal entry | YES | -- | YES | YES | -- |
| Feed entry | YES | YES | YES | YES | -- |
| Collection entry | YES | YES | YES | YES | -- |

Note: The "Playground" button appears on Feed/Collection entries but NOT on Journal entries. This is a meaningful difference -- Feed and Collection entries can be sent to the Playground for editing, while Journal entries are already in the user's editable space.

### Content Structure

| Page Type | Editor (textbox) | Read-only list | Date grouping | Inline wod blocks | Markdown tables |
|-----------|-----------------|----------------|---------------|-------------------|-----------------|
| Playground | YES | -- | -- | YES | YES |
| Journal (list) | -- | YES | YES | -- | -- |
| Journal entry | YES | -- | -- | YES | -- |
| Plan (list) | -- | YES | YES | -- | -- |
| Feeds (list) | -- | YES | YES | -- | -- |
| Feed entry | YES | -- | -- | YES | -- |
| Collections (list) | -- | YES | -- | -- | -- |
| Collection entry | YES | -- | -- | YES | YES |
| Syntax Doc | -- | -- | -- | YES (in editor panel) | -- |

---

## Key Similarities

1. **Universal nav** -- All pages share the same top navigation (Home, Journal, Plan, Feeds, Collections).
2. **Editor template** -- Journal entries, Feed entries, and Collection workouts all use the same Note/Entry Editor template (textbox with markdown + ```wod blocks).
3. **Calendar sidebar** -- Journal, Plan, Feeds, and Feed-entry-detail all share a month calendar component. Calendar days can be marked "has entries."
4. **Action bar pattern** -- Most detail pages have a bottom action bar with Play/Share/Schedule. The specific buttons vary by context.
5. **Search pattern** -- Global search (cmd+/) is available on most pages.
6. **Cast to TV** -- Available on most pages except Feeds list.
7. **Tag/category sidebar** -- Journal/Plan share TAGS; Collections has CATEGORIES; Feeds has its own FEEDS list. Same component, different data.

## Key Differences

1. **Sidebar context** -- Each top-level page has a completely different sidebar. Journal/Plan share tags; Collections has categories; Feeds has feed sources; Playground has syntax docs. This means the sidebar is context-driven, not a fixed layout.
2. **Bottom action bar** -- Playground has (Play, Share, Today, Schedule). Journal entries have (Play, Share, Schedule). Feed/Collection entries have (Play, Playground, Share, Schedule). The "Playground" button is only on read-only-source entries.
3. **Entry creation** -- Journal and Plan share the Command Palette for creating entries. Playground uses "New" and "New Note" inline. Collections and Feeds are read-only (no creation).
4. **Editable vs Read-only** -- Playground and Journal entries are freely editable. Feed and Collection entries appear read-only (they serve as source material to clone into your own notes).
5. **Date awareness** -- Journal is present-focused ("today"). Plan is future-focused. Feeds is past-focused (historical entries). Collections is date-agnostic.
6. **Header title format** -- Playground shows "Playground -- <date time>". Journal shows "Journal". Plan shows "Plan". Journal entries show the date "2026-05-15". Feed/Collection entries show their title.
7. **Filter/search** -- Collections has a dedicated filter textbox. Other list pages don't.
8. **Connecting status** -- Only Playground shows a "Connecting..." button (likely WebSocket/runtime connection).

---

## Page Relationships (Navigation Flow)

```
Playground (Home)
  |-- [sidebar] --> Syntax Docs (6)
  |-- [Run Workout] --> Runtime execution (in-page)
  |-- [New Note] --> New note in playground
  |-- [Today] --> Journal (today)
  |-- [Schedule] --> Plan?

Journal
  |-- [calendar day] --> Filter to date
  |-- [Start entry] --> Command Palette
  |     |-- [Blank] --> New Journal Entry (editor)
  |     |-- [Collection] --> Collections browser --> Collection Workout (editor)
  |     |-- [Feed] --> Feeds browser --> Feed Entry (editor)
  |     |-- [History] --> Past entry picker --> Journal Entry (editor, cloned)
  |-- [entry card] --> Journal Entry (editor)

Plan
  |-- [calendar day] --> Filter to date
  |-- [Create entry] --> Command Palette (same as Journal)

Feeds
  |-- [feed source] --> Filter to feed
  |-- [entry card] --> Feed Entry (editor, read-only)
  |-- [TODAY] --> Clone to Journal today

Collections
  |-- [category filter] --> Filter collections
  |-- [filter textbox] --> Filter by text
  |-- [collection card] --> Collection detail (workout list)
  |-- [workout item] --> Collection Workout (editor, read-only)
```

---

## Observations for Design System

1. **The Note/Entry Editor is the core reusable template.** It appears in 3 contexts (Journal, Feed, Collection) with only the sidebar and bottom action bar changing. This is the primary candidate for a shared component.

2. **Three sidebar "modes" exist:**
   - Calendar + Tags (Journal, Plan)
   - Calendar + Feed list (Feeds)
   - Categories (Collections)
   - Syntax docs (Playground, Syntax pages)
   - Breadcrumb + session/event list (detail pages)
   
   These could be modeled as a sidebar composition system.

3. **The Command Palette is the creation hub.** It bridges Journal/Plan to Collections and Feeds, making it the primary cross-domain navigation element.

4. **Date is a first-class dimension.** Calendar appears on 3 of 5 nav pages and most detail pages. Days can be marked with entries. This is a shared calendar component with context-specific highlighting.

5. **Action bar varies by "ownership":** Entries the user owns (Journal) get Play/Share/Schedule. Entries from external sources (Feed, Collection) get Play/Playground/Share/Schedule -- the "Playground" button is the escape hatch to edit a copy.
