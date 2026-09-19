# Screen: Collection Date View

- **Route:** `/c/:slug/:date` (legacy `/collections/:slug/:date`)
- **Host Component:** `apps/playground/app/pages/CollectionDatePage.tsx`
- **Domain Models:** `Collection`, `Page`, `Note`

---

## 1. Component & Service Dependencies

### Core UI Components
- `JournalPageShell` (`apps/playground/src/panels/page-shells/JournalPageShell.tsx`). Wraps collection date listings in the standard journal shell.
- `StickyPageHeader` (`apps/playground/src/panels/page-shells/StickyPageHeader.tsx`). Renders collection slug subtitle and date title.
- `Link` (`react-router-dom`). Navigates directly to canonical single-note editor via `noteByIdPath(entry.id)`.

### Services & Providers
- `IndexedDBContentProvider` (`apps/playground/src/services/content/IndexedDBContentProvider.ts`). Queries notes matching both `catalog === slug` and target calendar date.

---

## 2. Desktop View Layout (≥1024px)

- **Header:** Sticky banner with date title (`YYYY-MM-DD`) and collection slug badge.
- **Content Card List:** Bordered list of workout cards scheduled for or imported on that date. Each card displays title, creation time, and preview snippet.
- **Navigation Links:** Every card links directly to `/notes/:noteId`.

---

## 3. Mobile View Layout (<1024px)

- **Header:** Simplified top bar showing the date and collection breadcrumb.
- **Card Feed:** Full-bleed card list optimized for thumb tapping.
- **Thumb Dock:** Quick action button to add a new workout to this collection date.

---

## 4. Composable Behaviors

- **Universal Target Routing:**
  - Clicking any item navigates to `/notes/:noteId`, opening the universal editor.
  - Avoids nesting editor frames inside the collection view.
