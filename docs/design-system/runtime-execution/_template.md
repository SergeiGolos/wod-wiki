# Template: Tracker / Review (runtime execution)

|                 |                                                                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**        | Tracker / Review |
| **Code**        | `TrackerPage` / `ReviewPage` in `playground/src/App.tsx` |
| **Routes**      | `/tracker/:runtimeId`, `/review/:runtimeId` |

## Description

Fullscreen execution pages launched when a workout is run with `open: route` in a button pipeline. The `runtimeId` maps to a pending `WodBlock` stored in `pendingRuntimes` (an in-memory Map). `TrackerPage` shows live timer execution; `ReviewPage` shows post-workout results.
