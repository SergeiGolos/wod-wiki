# Navigation Decoupling Strategy

This document outlines the strategy for decoupling the Workbench from `react-router-dom`, allowing it to run in diverse environments (Production, Storybook, Mobile, Chromecast) with different navigation implementations.

## 1. Current State (Coupled)

Currently, `WorkbenchContext.tsx` is directly coupled to `react-router-dom` and the physical URL structure of the web application.

*   **Dependencies:** `useNavigate`, `useParams`, `useLocation`.
*   **Path Construction:** Directly calls `planPath(id)`, `trackPath(id, sectionId)`, etc.
*   **Navigation:** Calls `navigate(url)` which updates the browser's address bar.
*   **Issue:** In Storybook, updating the URL can cause the iframe to reload or break the Storybook UI context. It also makes the Workbench harder to test in isolation without a full router setup.

## 2. Proposed Abstraction: `INavigationProvider`

We will introduce a high-level interface that defines navigation **intents** rather than URL paths.

```typescript
export type WorkbenchView = 'plan' | 'track' | 'review' | 'history' | 'analyze';

export interface NavigationState {
  noteId?: string;
  sectionId?: string;
  resultId?: string;
  view: WorkbenchView;
}

export interface INavigationProvider {
  /** Current state of navigation (reactive) */
  readonly state: NavigationState;

  /** Navigate to a specific view for a note */
  goToPlan(noteId: string): void;
  goToTrack(noteId: string, sectionId: string): void;
  goToReview(noteId: string, sectionId?: string, resultId?: string): void;
  
  /** General purpose navigation */
  goTo(view: WorkbenchView, params?: Partial<Omit<NavigationState, 'view'>>): void;
  
  /** Go back (if supported by implementation) */
  goBack(): void;
}
```

## 3. Implementation Variants

### A. `ReactRouterNavigationProvider` (Production)
The default implementation used in the main web app.
*   **Mechanism:** Wraps `useNavigate()` and `useParams()`.
*   **Behavior:** Transforms `goToPlan('abc')` into `navigate('/note/abc/plan')`.
*   **State:** Derived from the actual browser URL.

### B. `InMemoryNavigationProvider` (Storybook / Testing)
Used in Storybook and unit tests.
*   **Mechanism:** Uses internal React `useState` to track the "current" view and IDs.
*   **Behavior:** Updates local state. No browser URL changes.
*   **State:** Purely in-memory.

### C. `NoOpNavigationProvider` (Chromecast / Receiver)
Used on the Chromecast receiver where navigation is driven remotely by the sender.
*   **Mechanism:** Ignores local navigation requests or logs them.
*   **Behavior:** Does nothing; the UI stays on the view commanded via RPC.

## 4. Workbench Integration

The `WorkbenchProvider` will now accept an optional `navigation` prop. If omitted, it will attempt to use a default implementation (or a hook-based factory).

```tsx
// src/components/layout/WorkbenchContext.tsx

interface WorkbenchProviderProps {
  // ... existing props
  navigation?: INavigationProvider;
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({ 
  navigation: externalNavigation,
  // ...
}) => {
  // Use provided navigation or default to a hook-based one
  const navigation = externalNavigation ?? useReactRouterNavigation();
  
  const setViewMode = (newMode: ViewMode) => {
    // Instead of navigate(planPath(id))
    navigation.goTo(newMode, { noteId: routeId, sectionId: routeSectionId });
  };
  
  // ...
}
```

## 5. Migration Plan

1.  **Define Interface:** Create `src/types/navigation.ts`.
2.  **Implement Production Hook:** Create `src/hooks/useReactRouterNavigation.ts`.
3.  **Implement Storybook Hook:** Create `src/hooks/useInMemoryNavigation.ts`.
4.  **Refactor WorkbenchContext:** Replace direct `useNavigate` calls with `navigation` interface methods.
5.  **Update StorybookWorkbench:** Inject `InMemoryNavigationProvider`.
