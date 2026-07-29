# Variant B — Year-stream + Catalogues as a virtual-bucket

**Layout:** One continuous date stream — but undated Sessions get a *virtual*
date header "Catalogues" pinned at the bottom, with the same row styling as
dated entries. The header is visually distinct (folder icon, amber accent,
no calendar metadata) so users grok "these are not on a date" at a glance.

**Modes carried over:** `today` (just today) + `all` (everything). History
expansion is dropped — the Library is a *glance* surface, not a deep archive.
Users wanting history keep using the Journal route.

**Where undated collections sit:** At the bottom of the date stream, with a
fake-but-coherent date header. They look like late date entries placed after
the oldest real date — discoverable by scrolling, but unambiguously "static".

**Why this might win:**
- A single, consistent row pattern across the whole surface — easier to
  implement, easier to extend (just feed more entries).
- Date-header visual language compounds muscle memory.
- The shared "Fran" between a dated note and a Session is naturally visible
  on the same row-style — the user's eye catches the duplicate.

**Risks:**
- If the user has 200+ Sessions, the bottom becomes the whole page.
- The "virtual date" is a slight lie — keyboard nav, deep links, ?s= filter
  reuse breaks. Date-picker calendar (e.g. min-cal) doesn't apply.
- Plan mode absent — users who plan via the Journal still need a back door.
