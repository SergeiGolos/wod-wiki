# Variant C — Mode strip + Undated pinned

**Layout:** A **mode strip** (History / Today / Plan / All) sits at the top of
the page and gates the date window. Undated Sessions get a **sticky
mini-shelf** pinned *between* the mode strip and the date stream — always
visible, collapsible, scrims the date stream when scrolling.

**Modes carried over:** All four Journal modes (`history|today|plan|all`) are
preserved. The strip surfaces the choice so users see what's loaded.

**Where undated collections sit:** Above the date stream, as a sticky mini-shelf
("+ 12 Sessions"). The pin keeps the affordance visible while the user explores
dates. The shelf is intentionally *narrow* — just count + expand — to keep
the row's real estate for the date stream.

**Why this might win:**
- The mode strip makes the **decision** between browse modes explicit and
  reviewable — exactly the question the issue asks.
- The pinned shelf solves the "below the fold" risk of Variant A.
- Plan mode survives — the Library includes future planning, which is one
  of the Journal's most-loved features.

**Risks:**
- UI overhead high: strip + pinned shelf + sticky date headers = 3 sticky layers.
- The strip competes with the search panel — both want real estate at the top.
- Without a search panel mocked here, the strip is dominant — but in the
  real build, the panel would push it down.
