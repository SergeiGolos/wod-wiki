# Route: `/tracker` / `/review`

|                    |                                                       |
| ------------------ | ----------------------------------------------------- |
| **Route Patterns** | `/tracker/:runtimeId`, `/review/:runtimeId`           |
| **Template**       | [Tracker / Review](design-system/runtime-execution/_template.md) |
| **Components**     | `TrackerPage`, `ReviewPage`                           |
| **Status**         | Implemented                                           |

## State Management

See [Tracker / Review template](design-system/runtime-execution/_template.md#state-management) for the shared state model.

## Description

Fullscreen execution and results pages for workouts. `:runtimeId` maps to an in-memory `WodBlock`. 
- `/tracker/` shows the live timer execution.
- `/review/` shows the post-workout results and analytics.
