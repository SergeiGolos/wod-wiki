---
state: open
assignee: null
labels: [wayfinder:task]
title: "Mount Results and Segments routes on QueriableStreamView"
blocked-by: ["004-route-cutover-direct-mounting.md"]
---

## Question

Legacy review routes (`/review/:runtimeId`, `/note/:noteId/review`) currently redirect to the broad analytics explorer at `/dashboard?q=rows:{result:...}`, leaving athletes without a dedicated tabular breakdown of their workout segment splits, interval pacing, or chronological execution history.

How do we mount dedicated execution telemetry routes on `QueriableStreamView`:
1. `/results` — defaulting to `rows:all{} last 4w` for a chronological stream of completed sessions.
2. `/results/:resultId` — defaulting to `rows:segment{result:<resultId>}` for a detailed tabular breakdown of rounds, intervals, and lap splits for an individual session.
3. `/results/segments` — defaulting to `rows:segment{} last 8w` for cross-session interval progression and pacing analysis.
4. Replace `ReviewRedirect` in `routes.tsx` to redirect legacy bookmarks cleanly to `/results/:resultId` instead of `/dashboard`.
5. Verify that `/dashboard` remains strictly the user's permanent, non-deletable custom dashboard note, decoupled from chronological workout results.
