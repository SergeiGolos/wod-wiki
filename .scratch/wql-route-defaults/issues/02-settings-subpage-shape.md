# Settings sub-page shape

Type: prototype
Blocked by: 01

## Question

What does the new Settings sub-page look like and behave like, at prototype fidelity, so the real build has something to react to?

- Route/name consistent with the existing settings sub-route pattern (`/settings/appearance`, `/settings/system`, `/settings/library/calcs`) — candidate `/settings/query-defaults`. Nav entry alongside existing tabs/entries.
- One subsection per configured route (library family, `/efforts`, results family, palette): the in-code system default shown read-only, the user's override editor above/below it, a reset affordance per route.
- Per route: a WQL editor for the default query (plain textarea with live parse diagnostics vs embedding the composer — prototype both cheaply) and list editors for the source options and Group-By options (add/remove/reorder, with "empty means nudge" expressible).
- Open question the prototype should answer: does the page feel like one long scroll with anchors, or route-per-subsection?

## Answer

Resolved by implementation as the first-pass artifact: `/settings/queries` tab (Settings ▸ Query Defaults) with one card per surface — read-only system default shown, WQL editor with live parse diagnostics (invalid blocks save), Custom toggles for source/Group-By option lists with chip editors, emptied list flagged as the nudge state, per-route reset. Tests pin the persisted-storage behavior.

Status: resolved
