# Template: Report

**Component:** `ReportTemplate` (Template)
**Atomic Level:** Template — post-workout analytics lifecycle + result data shell
**Status:** Design Draft
**Parent Template:** [FocusTemplate](../00.layout-template/focus-template.md) *(substitutable with AppTemplate for inline overlay mode)*
**Last Updated:** 2026-04-30

---

## Overview

`ReportTemplate` is the page-type shell for displaying post-workout analytics. It owns result loading from IndexedDB (keyed by `runtimeId`), analytics computation (raw logs → `Segment[]`), title derivation from the linked note, and loading/error state lifecycle. It exposes a typed `ReportContext` to child pages.

This template is visually similar to `RuntimeTemplate` in that the content panel is dominated by a single full-screen component (`FullscreenReview`), but it is read-only and can return to the navigation shell after viewing.

---

## Pages Using This Template

| Page | Route | Current File |
|------|-------|------|
| Review | `/review/:runtimeId` | `playground/src/pages/ReviewPage.tsx` |

---

## Routing & URL State

Identity is carried entirely in the path. No nuqs params at this template level.

| Param | Source | Purpose |
|-------|--------|---------|
| `:runtimeId` | path (react-router) | IndexedDB result key; same ID used by RuntimeTemplate on completion |

---

## Data Loading

| Data | Source | How |
|------|--------|-----|
| Workout result | IndexedDB | `indexedDBService.getResultById(runtimeId)` |
| Segment analytics | Derived from result logs | `getAnalyticsFromLogs(result.data.logs, result.data.startTime)` → `Segment[]` |
| Note title | Derived from `result.noteId` | Last path segment of `noteId` used as display title |

Loading is triggered on mount. The template handles the three-state lifecycle: loading → loaded → error.

### Typed Output: `ReportContext`

```ts
interface ReportContext {
  runtimeId: string

  // Loaded data
  result: WorkoutResult | null
  segments: Segment[] | null        // null while loading, [] if no log data
  title: string
  isLoading: boolean
  error: string | null

  // Actions (event hub)
  onClose: () => void
  onReplay: (runtimeId: string) => void
  onViewNote: (noteId: string) => void
}
```

---

## Event Hub

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onClose()` | `navigate(-1)` — go back in history | Navigate to a specific destination (e.g. journal entry) |
| `onReplay(runtimeId)` | Re-reads the result's `WodBlock` → stores new pending runtime → `navigate('/tracker/:newId')` | Prompt user before re-running |
| `onViewNote(noteId)` | Resolves `noteId` → navigates to origin note | Open note in a side panel |

---

## AppTemplate Slot Assignments

The review UI is immersive but not full-screen-locked like the timer — the nav shell remains accessible.

| AppTemplate Panel | During Review | Notes |
|-------------------|--------------|-------|
| `leftPanel` | Hidden or collapsed | Result does not have a TOC |
| `contentPanel` | `FullscreenReview` results matrix | Full height, scrollable |
| `rightPanel` | Hidden | — |
| `contentHeader` | Note title + close button | Template — `ReportHeader` |

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| Result load from IndexedDB | ✅ | — |
| Analytics computation | ✅ | — |
| Title derivation | ✅ | — |
| Loading / error states | ✅ | `loadingContent?: ReactNode`, `errorContent?: ReactNode` |
| Review UI | ✅ — `FullscreenReview` | — |
| Close navigation | ✅ (configurable) | Override `onClose` to change destination |
| Replay flow | ✅ (configurable) | Override `onReplay` to change behaviour |
| View-note navigation | ✅ (configurable) | Override `onViewNote` |
| Custom metric panels | Optional extension | Pass additional `SegmentPanel[]` to review component |

---

## Layout Structure

```
AppTemplate
├── leftPanel     → hidden (no TOC for result pages)
├── contentHeader → [ReportHeader]  note title + close button
└── contentPanel
      └── [FullscreenReview]  full height, scrollable
            ├── [SegmentSummary]     total time, rounds, reps
            ├── [SegmentTimeline]    per-segment bars / sparklines
            ├── [MovementBreakdown]  per-exercise metrics
            └── [Actions]
                  ├── onClose  →  navigate back
                  └── onReplay →  pendingRuntimes + /tracker/:newId
```