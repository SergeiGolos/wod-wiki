# Route: `/load`

| | |
|--|--|
| **Route** | `/load` |
| **Component** | `LoadZipPage` |

## State Management

### URL State (react-router `useSearchParams`, not nuqs)

| Param | Type | Purpose |
|-------|------|---------|
| `?zip=` / `?z=` | base64 string | Encoded workout bundle. Both aliases are accepted; `?z=` is the shorter shareable form. |

This is a **utility redirect route** — it reads the param, decodes it, saves the result to IndexedDB, and immediately redirects to `/playground/:id`. It is never a persistent page.

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `error` | `string \| null` | Error message shown if base64 decoding or IndexedDB save fails. |

## Description

A utility route for loading workout bundles. It decodes `?zip=` or `?z=` base64-encoded workout data.
