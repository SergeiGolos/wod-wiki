# Route: `/tracker` / `/review`

|                    |                                                       |
| ------------------ | ----------------------------------------------------- |
| **Route Patterns** | `/tracker/:runtimeId`, `/review/:runtimeId`           |
| **Template**       | [Tracker / Review](../templates/runtime-execution.md) |
| **Components**     | `TrackerPage`, `ReviewPage`                           |

## Description

Fullscreen execution and results pages for workouts. `:runtimeId` maps to an in-memory `WodBlock`. 
- `/tracker/` shows the live timer execution.
- `/review/` shows the post-workout results and analytics.
