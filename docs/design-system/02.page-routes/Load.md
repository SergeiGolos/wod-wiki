# Page: Load (Utility Redirect)

**Route:** `/load`
**Template:** None — utility redirect; renders a loading spinner or error message only
**Layout:** None (no AppTemplate or FocusTemplate shell)
**Status:** Implemented
**Source:** `playground/src/pages/LoadZipPage.tsx`
**Reference:** [Utility: Load](../utility/load.md)

---

## Overview

`LoadZipPage` is a stateless utility redirect. It reads a base64-encoded workout bundle from `?zip=` or `?z=`, decodes it, saves the result to IndexedDB, and immediately redirects to `/playground/:id`. The user never sees this page as a destination — it exists only to materialise a shareable link into a local playground note.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/load` |
| `?zip=` / `?z=` | Base64-encoded workout bundle. Both aliases accepted; `?z=` is the short shareable form. |
| Mechanism | `react-router` `useSearchParams` (not nuqs — this page does not persist URL state) |

---

## Page Lifecycle

```
Mount
  └─ read ?zip= / ?z=
       ├─ missing → show error "No workout data in URL"
       ├─ decode + save to IndexedDB
       │    ├─ success → navigate('/playground/:newId', { replace: true })
       │    └─ failure → show error message
       └─ (spinner shown during async save)
```

The redirect uses `replace: true` so the `/load` URL is not in history — pressing Back from the playground will not return to the loading spinner.

---

## Local State

| State | Type | Purpose |
|-------|------|---------|
| `error` | `string \| null` | Shown if decoding or IndexedDB save fails |

---

## Template / Slot Assignments

None. This page renders only a full-viewport centered spinner or error message with no AppTemplate or FocusTemplate shell. It is intentionally minimal because it is never a resting state.

---

## Data

| Operation | Detail |
|-----------|--------|
| Read | `?zip=` / `?z=` from URL search params |
| Decode | `atob()` / base64url → JSON workout bundle |
| Write | `indexedDBService.saveNote(bundle)` → returns new `id` |

---

## Navigation From This Page

| Outcome | Destination |
|---------|-------------|
| Success | `/playground/:newId` (replace — no back entry) |
| Error | Stays on `/load` showing the error message with a "Go Home" fallback link |
