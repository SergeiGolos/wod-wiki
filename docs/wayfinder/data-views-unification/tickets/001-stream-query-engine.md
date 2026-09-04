---
state: closed
assignee: null
labels: [wayfinder:task]
title: "StreamQueryEngine across content, efforts, and rows planes"
blocked-by: []
---

## Question

Today, `apps/playground/app/lib/entrySearch.ts` (`searchEntries`) is a shallow intake helper that handles only `find:note` and `find:block`. `find:effort` queries are executed separately inside `EffortsCatalogPage`, while `rows:` queries are diverted to the general explorer at `/dashboard`.

How do we deepen `entrySearch.ts` into a unified `StreamQueryEngine` that:
1. Accepts any valid find or rows WQL query string or AST (`find:note`, `find:block`, `find:effort`, `rows:all`, `rows:segment`, `rows:event`).
2. Dispatches to the appropriate query service method (`queryService.runFind`, `runFindEffort`, or `runRows`) transparently behind a single seam.
3. Maps all returned records into an extended, uniform `Entry` model carrying optional execution metrics or effort metadata.
4. Preserves secondary text searching (e.g. searching block bodies alongside note titles when `text:` is present).
