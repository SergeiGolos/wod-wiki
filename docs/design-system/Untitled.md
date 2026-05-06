  
  
**![:card_index_dividers:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f5c2-fe0f@2x.png)** **Wod.Wiki — Button Inventory by Page**  
  
*Global Toolbar *(appears on all note pages via `NotePageActions`)**  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **New** (split left) | `+` Plus | Navigate to today's journal entry |  
| **New → calendar** (split right) | ![:date:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f4c5@2x.png) CalendarDays | Open date picker → navigate to selected date's journal entry |  
| **Cast** | Cast icon | RPC cast action |  
| **Audio Toggle** | Audio icon | Toggle audio on/off |  
| **Theme Switcher** | ![:sunny:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/2600-fe0f@2x.png)/![:crescent_moon:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f319@2x.png)/![:desktop_computer:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f5a5-fe0f@2x.png) | Dropdown → Light / Dark / System |  
| **⋮ Actions Menu** | Ellipsis vertical | Dropdown: _On this page_ links + Download Markdown + Debug Mode + Reset & Clear Cache |  
  
---  
  
**Journal List Page (**`**/journal**`**)**  
  
_(in_ `_JournalNavPanel_` _— sidebar)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| Date cell (calendar grid) | — | Toggle `?d=` filter to that date |  
| Active date **×** badge | — | Clear date filter |  
| Tag chip (e.g. _strength_, _cardio_) | — | Toggle tag filter on/off |  
  
_(in_ `_JournalDateScroll_` _— main list)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| Date group / journal entry card | ![:date:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f4c5@2x.png) / ![:page_facing_up:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f4c4@2x.png) | Open that date's journal entry |  
| **+ Create entry** (empty dates) | — | Create a new journal entry for that date |  
  
---  
  
**Journal Entry Page (**`**/journal/:date**`**)**  
  
Inherits **Global Toolbar** above.  
  
_(in_ `_JournalNavPanel_` _— sidebar)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| Date cell (calendar grid) | — | Navigate to that date's journal entry |  
  
_(inline WOD block commands — via_ `_InlineCommandBar_`_)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **![:arrow_forward:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/25b6-fe0f@2x.png)** **Start** | Play | Open fullscreen timer for that WOD block |  
  
_(in_ `_FullscreenTimer_` _overlay)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **✕ Close** | X | Close timer (mid-workout or after completion) |  
| **Cast** | Cast | RPC cast |  
| **Audio** | Audio | Toggle audio |  
  
_(in_ `_FullscreenReview_` _overlay)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **✕ Close** | X | Close review, return to journal |  
| **Cast** | Cast | RPC cast |  
| **Audio** | Audio | Toggle audio |  
  
---  
  
**Collections List Page (**`**/collections**`**)**  
  
_(in_ `_CollectionsNavPanel_` _— sidebar)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| Category chip (e.g. _Strength_) | ● dot | Toggle category filter on/off |  
| **Clear** | — | Clear all active category filters |  
  
_(in_ `_CollectionsPage_` _view — main list)_  
  
| Button | Action |  
|--------|--------|  
| Collection card | Navigate to `/collections/:id` |  
  
---  
  
**Collection Workout Page (**`**/workout/:category/:name**`**)**  
  
Inherits **Global Toolbar** above.  
  
_(inline WOD block commands —_ `_collectionCommands_` _via_ `_InlineCommandBar_`_)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **![:arrow_forward:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/25b6-fe0f@2x.png)** **Now** | Play (primary) | Start workout immediately — appends to today's journal, launches timer |  
| **Today** | ![:date:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f4c5@2x.png) CalendarDays | Schedule this block to today — appends to today's journal, shows toast |  
| **Plan** | ![:date:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/1f4c5@2x.png) CalendarDays | Open date-picker modal → pick a future date → appends to that date's journal |  
  

> ![:warning:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/26a0-fe0f@2x.png) **These are the "Today" + "Plan" buttons you want to merge.**

  
  
  
  
---  
  
**Playground Note Page (**`**/playground/:id**`**)**  
  
Inherits **Global Toolbar** above.  
  
_(inline WOD block commands)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **![:arrow_forward:](https://a.slack-edge.com/production-standard-emoji-assets/15.0/google-medium/25b6-fe0f@2x.png)** **Start** | Play | Navigate to `/tracker/:runtimeId` (fullscreen timer) |  
  
---  
  
**Tracker Page (**`**/tracker/:runtimeId**`**)**  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **✕ Close** | X | Return to source note |  
| **Cast** | Cast | RPC cast |  
| **Audio** | Audio | Toggle audio |  
  
_(on completion)_  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **✕ Close** | X | Navigate to `/review/:runtimeId` |  
  
---  
  
**Review Page (**`**/review/:runtimeId**`**)**  
  
| Button | Icon | Action |  
|--------|------|--------|  
| **✕ Close** | X | Go back (`navigate(-1)`) |  
| **Cast** | Cast | RPC cast |

  

[10:10 PM]

| **Audio** | Audio | Toggle audio |  
  
---  
  
**Search Panel (**`**SearchNavPanel**`**)**  
  
| Button | Action |  
|--------|--------|  
| **All** radio | Set search scope to all |  
| **Collections** radio | Set search scope to collections |  
| **Notes** radio | Set search scope to notes |  
| **Results** radio | Set search scope to results |  
  
---