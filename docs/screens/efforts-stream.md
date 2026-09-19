# Screen: Efforts Stream

- **Route:** `/efforts`
- **Host Component:** `apps/playground/app/views/stream/QueriableStreamView.tsx` (`EFFORTS_STREAM_PROFILE`)
- **Domain Models:** `Effort` (`IEffort`)

---

## 1. Component & Service Dependencies

### Core UI Components
- `QueriableStreamView` (`apps/playground/app/views/stream/QueriableStreamView.tsx`). Controller initialized with `find:effort`.
- `StreamQueryBar` (`apps/playground/app/views/stream/StreamQueryBar.tsx`). Discipline and intensity filter controls.

### Services & Registries
- `useEffortRegistry` (`apps/playground/app/contexts/EffortRegistryContext.tsx`). In-memory movement registry supporting fuzzy search and attribute lookups.
- `queryService` (`apps/playground/src/services/queryService.ts`). Scans the `efforts` IndexedDB store.

---

## 2. Desktop View Layout (≥1024px)

- **Context Sidebar:** Highlights "Efforts" navigation item.
- **Sticky Header:** WQL query bar with discipline pills (Weightlifting, Gymnastics, Monostructural) and "New Effort" action.
- **Grid Layout:** Multi-column card grid showing exercise name, MET value, discipline factor, and alias badges.
- **Right Rail:** Discipline facets, source filter (Bundled vs User), and intensity tier distribution.

---

## 3. Mobile View Layout (<1024px)

- **Top Navbar:** "Movement Registry" header.
- **Card Feed:** Single-column scroll list of exercise definitions.
- **Thumb Dock FAB:** Floating `+` button opens new effort authoring dialog.
- **Thumb Footer:** Mobile WQL query bar.

---

## 4. Composable Behaviors

- **Effort Card Navigation:**
  - Clicking any card opens `/e/:slug` (the specialized detail view of `/p/:slug`).
- **Instant Search:**
  - Typing in the query bar filters in-memory registry rows immediately without network or database roundtrips.
