# Component: Toast Notification System

| | |
|--|--|
| **Name** | Toast Notification System |
| **Code** | `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`, `src/hooks/use-toast.ts` |
| **Mounted in** | `playground/src/App.tsx` (inside `<BrowserRouter>`) |
| **Status** | Implemented |

## Description

A non-blocking notification layer for surfacing transient feedback to the user without interrupting their current workflow. Toasts slide in from the bottom-right corner, auto-dismiss after a configurable duration, and support an optional action button for follow-up navigation.

Built on **Radix UI Toast** primitives with Tailwind CSS variants. State is managed in a **module-level singleton reducer** — any component can fire a toast via `toast()` without prop drilling or context.

## Architecture

The system is split across three files to separate concerns:

| File | Role |
|------|------|
| `src/hooks/use-toast.ts` | Global state — `useToast()` hook + `toast()` imperative caller |
| `src/components/ui/toast.tsx` | Radix primitive wrappers (`Toast`, `ToastAction`, `ToastTitle`, etc.) with Tailwind variants |
| `src/components/ui/toaster.tsx` | `<Toaster />` provider — consumes `useToast()` and renders the viewport |

`<Toaster />` is mounted once in the app root **inside `<BrowserRouter>`** so that `ToastAction` onClick handlers can call `useNavigate()` safely.

## State Model

Toast state lives in a **module-level singleton** (`memoryState`) updated by a shared reducer. Components subscribe via `useToast()`.

### Global State (module singleton, not URL)

| Field | Type | Purpose |
|-------|------|---------|
| `toasts` | `ToasterToast[]` | Ordered list of active toasts (newest first). Max 3 concurrent. |

### Toast Lifecycle

```
toast({ ... })           ← ADD_TOAST (open: true)
       ↓
  user closes / auto-dismiss
       ↓
  DISMISS_TOAST          ← sets open: false (triggers exit animation)
       ↓
  REMOVE_TOAST           ← after ~1s delay, purges from state
```

Auto-remove delay (`TOAST_REMOVE_DELAY`) is intentionally large (1 000 000 ms) — Radix drives the actual close timing via `duration`. The remove step only fires after the toast has already exited.

## API

### `toast(props)` — imperative caller

Call from anywhere (no hook required at the call site).

```typescript
import { toast } from '@/hooks/use-toast'

toast({
  title: 'Added to Monday, April 22',
  description: '"Push Day" was added to your journal.',
  action: (
    <ToastAction altText="View journal entry" onClick={() => navigate('/journal/2025-04-22')}>
      View Note
    </ToastAction>
  ),
  duration: 7000,   // ms; omit for Radix default (~5000ms)
  variant: 'default',
})
```

Returns `{ id, dismiss, update }` for programmatic control.

### `useToast()` — hook

Used internally by `<Toaster />`. Exposes the full state + imperative callers.

```typescript
const { toasts, toast, dismiss } = useToast()
```

### Toast Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `title` | `ReactNode` | — | Bold heading line |
| `description` | `ReactNode` | — | Secondary text line |
| `action` | `ToastActionElement` | — | Must use `<ToastAction>` (Radix primitive); supports `onClick` and `asChild` |
| `variant` | `'default' \| 'destructive'` | `'default'` | Controls colour scheme |
| `duration` | `number` (ms) | ~5000 | Override Radix auto-dismiss timing |
| `open` | `boolean` | `true` | Managed by the reducer; do not set manually |
| `onOpenChange` | `(open: boolean) => void` | auto-dismiss | Wired by the reducer; do not override |

## Variants

| Variant | Visual | When to Use |
|---------|--------|-------------|
| `default` | Neutral background, foreground text | Success confirmations, informational notices |
| `destructive` | Red border, destructive-colour bg | Errors, failures, irreversible actions |

## Usage Examples

### Success toast with navigation action

```typescript
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

toast({
  title: `Added to ${dateLabel}`,
  description: `"${name}" was added to your journal.`,
  action: (
    <ToastAction altText="View journal entry" onClick={() => navigate(journalRoute)}>
      View Note
    </ToastAction>
  ),
  duration: 7000,
})
```

### Error / destructive toast

```typescript
toast({
  variant: 'destructive',
  title: 'Could not save workout',
  description: `Failed to add "${name}" to ${dateLabel}. Please try again.`,
})
```

## Integration Checklist

When adding the toast system to a new app shell:

1. `<Toaster />` must be rendered **inside `<BrowserRouter>`** if any `ToastAction` will call `useNavigate()`.
2. `<Toaster />` must be a sibling of (or outside) any `overflow: hidden` containers to avoid clipping the viewport.
3. Import `toast` (not `useToast`) at the call site unless you need access to the full toast list.

## Current Uses

| Location | Trigger | Toast Content |
|----------|---------|---------------|
| `WorkoutEditorPage` — `handleScheduleBlock` | "Today" button or date-picker "Plan" on a collection block | Success: date label + workout name + "View Note" action → `/journal/:date`. Destructive: IndexedDB write failure. |

## Layout Layer

`<ToastViewport>` renders at **`z-[100]`**, above dialogs (`z-50`) and the sticky header (`z-30`). It is positioned `fixed bottom-0 right-0` on desktop and `fixed top-0` on mobile (sm breakpoint and below).
