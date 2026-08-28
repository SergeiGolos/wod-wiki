---
state: open
labels: [wayfinder:task]
title: "Cutover — absorb AnalyticsWidgets, verify in Storybook"
blocked-by: ["004-aggregate-widget-sections", "005-rows-and-find-sections", "006-live-edge-states"]
---

## Question

Complete the merge and prove the destination:

1. Delete `apps/storybook/src/AnalyticsWidgets.stories.tsx`. Confirm every
   story it carried has a live successor in the merged gallery
   (QueryValue, TopList, Timeseries, Bar, StackedBar, Empty) — anything
   still unique is migrated first.
2. Decide the fate of its `RangeSelectorWidget` story: dashboard chrome
   is out of scope for this map, so the story is dropped — unless a
   natural home already exists elsewhere in the storybook. Record the
   call in the resolution.
3. Update any docs/comments/links referencing the old story (map notes,
   storybook index, README pointers).
4. Drive the merged gallery in Storybook (localhost:6006) with the
   browser tool: every manifest row renders, no console errors, edge
   states behave. Screenshot evidence linked as the ticket asset.
5. Run the storybook test suite (`apps/storybook/test/`) — existing tests
   referencing either file pass or are updated.

Resolution records: the deletion, the RangeSelector call, verification
evidence. Closing this ticket completes the map.
