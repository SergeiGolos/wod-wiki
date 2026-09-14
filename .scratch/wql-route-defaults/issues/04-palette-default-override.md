# Palette default override

Type: grilling
Blocked by: 01

## Question

The ⌘K palette seeds its search from `find:note` (`App.tsx:145-158`, `app/services/wqlSearchSource.ts:96-98`) and dual-dispatches a secondary `find:block{text:…}` search. With a Route WQL Config for the palette:

- Does the configured default replace only the seeded initial query, or does the secondary `find:block` dispatch follow the configured query's target too (e.g. a `find:effort` palette default — is there still a block search, and with what query)?
- Does palette config support only a default query, or also the source/Group-By option lists (the palette has neither UI today)?
- Where does its subsection live on the settings sub-page, given the palette is a global surface rather than a route with a landing state?
