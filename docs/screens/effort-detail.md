# Screen: Effort Detail

- **Route:** `/e/:slug` (legacy `/effort/:slug`)
- **Host Component:** `apps/playground/app/pages/EffortDetailPage.tsx`
- **Domain Models:** `Effort` (`IEffort`), `Note`, `Session`, `EventRecord`

---

## 1. Component & Service Dependencies

### Core UI Components
- `JournalPageShell` (`apps/playground/src/panels/page-shells/JournalPageShell.tsx`). Shell container for effort definition.
- `NoteEditor` (`apps/playground/src/components/organisms/editor/NoteEditor.tsx`). Renders freeform exercise notes, instructions, and technique cues.
- `CalendarCard` (`apps/playground/src/components/atoms/CalendarCard.tsx`). Inline calendar showing recent session dates for this movement.

### Services & Registries
- `useEffortContent` (`apps/playground/app/hooks/useEffortContent.ts`). Loads effort attributes, derivation rules, and markdown body.
- `useEffortRegistry` (`apps/playground/app/contexts/EffortRegistryContext.tsx`). Upserts and resolves movement definitions.
- `EffortResolver` (`@bitcobblers/wod-wiki-lang`). Resolves inheritance chains and synthetic modifiers.

---

## 2. Desktop View Layout (≥1024px)

- **Sticky Header:** Movement title, MET badge, discipline pill, source indicator (Bundled / User), and Edit button.
- **Attributes Section:** Structured card displaying primary attributes (MET, discipline factor, intensity tier, aliases).
- **Prose Runway:** Markdown instructions and form cues rendered in `NoteEditor`.
- **History Rail (216px right):** Recent workout executions involving this movement.

---

## 3. Mobile View Layout (<1024px)

- **Navbar:** Movement title and discipline pill.
- **Content Flow:** Vertically stacked attributes card followed by markdown prose.
- **Thumb Dock FAB:** "Log Effort" or "Start Workout" button.
- **Dock Overflow Sheet:** Options to edit movement properties, clone effort, or view analytics.

---

## 4. Composable Behaviors

- **Authoring Synchronization:**
  - Editing properties updates both the parsed registry record and the underlying note body.
  - Invalid attributes trigger toast errors while preserving user draft text in place.
- **Recent Sessions Cross-Join:**
  - Queries `sessions` and `events` where `effortSlug === slug` to populate recent workout performance history.
