# Variant A — Dated stream + Static shelf

**Layout:** Dated items (Notes + Posts) flow on the Journal's date stream.
Undated Sessions get a **static shelf** at the bottom of the page, anchored
to the page (not a date).

**Modes carried over:** `history` (default) + `all` (newest-first). The plan
window is dropped — future planning lives in the Journal route; the Library
is a *browse* surface for what's already there. Today is highlighted at the top.

**Where undated collections sit:** Pinned at the bottom of the page as a
collapsible "Catalogues" section. They are *not* a date — they're a stable
side-rail of named workouts you can add to any day. Reads as "your static
library" — semantically correct for hard-set content.

**Why this might win:**
- Dated date headers stay consistent with the Journal — lowest cognitive load.
- The shelf reads as a different *kind* of content (static, not a record), so
  the visual contrast justifies a separate section.
- Source filters (Session toggle) work cleanly: off hides the shelf, neutral
  leaves it open, on surfaces it.
- Build cost is low — extend the Journal's `JournalFeed` and append a shelf.

**Risks:**
- If users think "library" must include planning, the absence of plan mode
  could confuse.
- The shelf feels "below the fold" — needs a sticky CTA or always-visible
  mini version.
