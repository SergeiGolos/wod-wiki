# Template: Tracker / Review (runtime execution)

|                 |                                                                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**        | Tracker / Review |
| **Code**        | `TrackerPage` / `ReviewPage` in `playground/src/App.tsx` |
| **Routes**      | `/tracker/:runtimeId`, `/review/:runtimeId` |
| **Status**      | Implemented |

## State Management

Tracker and Review pages are **fullscreen execution pages** with no persistent URL state beyond the route param.

### URL State

| Param | Mechanism | Purpose |
|-------|-----------|---------|
| `:runtimeId` | react-router path param | Identifies the pending block (TrackerPage) or stored result (ReviewPage). Not a query param — no `nuqs` used. |

### Local State (outside URL)

**TrackerPage:**

| State | Type | Purpose |
|-------|------|---------|
| `pendingRef` | `WodBlock \| undefined` | Reference to the `WodBlock` resolved from the in-memory `pendingRuntimes` Map on mount. The entry is **consumed** (deleted) from the Map immediately to prevent memory leaks. |

**ReviewPage:**

| State | Type | Purpose |
|-------|------|---------|
| `segments` | `Segment[] \| null` | Analytics segments loaded from IndexedDB; `null` while loading. |
| `title` | `string` | Display title derived from the result's `noteId`. |
| `error` | `string \| null` | Error message if the result is not found or fails to load. |

> Both pages navigate away (`useNavigate(-1)`) on close — they are always transient and not intended to be bookmarked.
