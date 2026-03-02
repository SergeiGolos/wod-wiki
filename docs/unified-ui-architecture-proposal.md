# Unified UI Architecture Proposal
## Bridging Runtime and Chromecast Display with Shared React Components

**Version:** 1.0
**Date:** 2026-03-02
**Status:** Proposal

---

## Executive Summary

This document proposes a unified architecture that enables **identical React components** to be used for both the **Track Panel** (Workbench) and **Chromecast Receiver** displays, eliminating the current duplication and abstraction mismatch.

### Current Problem

The Track Panel and Chromecast Receiver show the same conceptual workout state but use different components and data binding mechanisms:

- **Track Panel**: Uses live `IRuntimeBlock` objects with direct memory subscriptions
- **Chromecast**: Uses serialized `RemoteState` JSON snapshots with manual span calculations
- **Result**: Components like `StackBlockItem` and `RemoteStackBlockItem` are duplicated, implementing identical visual logic but incompatible data sources

### Proposed Solution

Introduce a **unified view model layer** (`IWorkoutDisplayModel`) that abstracts the runtime/transport differences, allowing:

1. **Same React components** for both environments
2. **Consistent data binding** through a reactive model interface
3. **Transport-agnostic** serialization (RPC or local subscriptions)
4. **Zero functional regression** — all current Track Panel features maintained

---

## Table of Contents

1. [Current Architecture (C4 Diagrams)](#1-current-architecture-c4-diagrams)
2. [The Abstraction Gap](#2-the-abstraction-gap)
3. [Proposed Architecture (C4 Diagrams)](#3-proposed-architecture-c4-diagrams)
4. [Implementation: Before & After Code Examples](#4-implementation-before--after-code-examples)
5. [Migration Path](#5-migration-path)
6. [Validation & Testing Strategy](#6-validation--testing-strategy)
7. [Future Extensions](#7-future-extensions)

---

## 1. Current Architecture (C4 Diagrams)

### 1.1 Context Diagram — Current State

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WOD Wiki System                             │
│                                                                     │
│  ┌────────────────────┐              ┌────────────────────────┐    │
│  │   Workbench UI     │              │  Chromecast Receiver   │    │
│  │  (Track Panel)     │              │     (TV Display)       │    │
│  │                    │              │                        │    │
│  │  • Direct runtime  │              │  • WebSocket JSON      │    │
│  │  • React hooks     │              │  • State snapshots     │    │
│  │  • Memory subs     │              │  • Local RAF loop      │    │
│  └─────────┬──────────┘              └──────────┬─────────────┘    │
│            │                                    │                  │
│            │                                    │                  │
│            ▼                                    ▼                  │
│  ┌─────────────────────┐              ┌────────────────────────┐  │
│  │  ScriptRuntime      │              │  WebRTC Transport      │  │
│  │  • RuntimeStack     │              │  • Cast Signaling      │  │
│  │  • IRuntimeBlock[]  │◄─────────────│  • DataChannel msgs    │  │
│  │  • Memory cells     │  Serialize   │                        │  │
│  └─────────────────────┘              └────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                          ▲
         │                                          │
    User Input                                 D-Pad Remote
```

**Key:** The Workbench and Receiver are architecturally isolated — **no shared component code** between them.

---

### 1.2 Container Diagram — Current Track Panel

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Track Panel (Workbench)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              <ScriptRuntimeProvider>                           │ │
│  │  Provides: IScriptRuntime instance to all children           │ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                         │                                           │
│    ┌────────────────────┼─────────────────────────┐                 │
│    │                    │                         │                 │
│    ▼                    ▼                         ▼                 │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐ │
│  │ Visual State │  │ Timer Display │  │  DisplaySyncBridge      │ │
│  │    Panel     │  │               │  │  (Chromecast Sync)      │ │
│  └───────┬──────┘  └───────┬───────┘  └────────┬────────────────┘ │
│          │                 │                    │                  │
│          ▼                 ▼                    ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │           Runtime Stack + Block Memory Layer                 │ │
│  │                                                              │ │
│  │  IRuntimeBlock.getMemory('time') → TimerState               │ │
│  │  IRuntimeBlock.getMemoryByTag('fragment:display') → frags    │ │
│  │  IRuntimeBlock.getMemoryByTag('controls') → ButtonConfig[]  │ │
│  │  IRuntimeBlock.getFragmentMemoryByVisibility('display')     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **VisualStatePanel**
   - Uses `RuntimeStackView` which renders `StackBlockItem[]`
   - Each `StackBlockItem` calls `block.getFragmentMemoryByVisibility('display')`
   - Subscribes to memory locations: `loc.subscribe(() => setFragments(...))`
   - Uses `useTimerElapsed(blockKey)` for per-block timer display

2. **TimerDisplay** → **StackIntegratedTimer**
   - Calls `usePrimaryTimer()`, `useSecondaryTimers()`, `useStackTimers()`
   - Subscribes to timer memory on all blocks
   - Runs `requestAnimationFrame` when `isAnyTimerRunning`
   - Passes props to **TimerStackView** (presentational component)

3. **DisplaySyncBridge**
   - Consumes **same hooks** as VisualStatePanel and TimerDisplay
   - Serializes everything into `RemoteState` JSON
   - Writes to `workbenchSyncStore.displayState`
   - **Problem**: Must duplicate all display logic that the UI does

---

### 1.3 Container Diagram — Current Chromecast Receiver

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Chromecast Receiver App                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  WebRTC DataChannel (via Cast Receiver SDK)                   │ │
│  │  Receives: { type: 'state-update', payload: { displayState } }│ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                         │                                           │
│                         ▼                                           │
│              useState<RemoteState | null>                           │
│                         │                                           │
│        ┌────────────────┼─────────────────────┐                     │
│        │                │                     │                     │
│        ▼                ▼                     ▼                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐         │
│  │  Remote      │  │  TimerStack   │  │ requestAnimation│         │
│  │  VisualState │  │    View       │  │ Frame (RAF)     │         │
│  │  Panel       │  │ (shared!)     │  │                 │         │
│  └───────┬──────┘  └───────┬───────┘  └─────────┬───────┘         │
│          │                 │                     │                 │
│          ▼                 ▼                     ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │      RemoteState JSON Snapshot + Local Clock                │ │
│  │                                                              │ │
│  │  remoteState.displayRows[] → RemoteDisplayRow               │ │
│  │  remoteState.timerStack[] → RemoteTimerEntry                │ │
│  │  calculateElapsedFromSpans(spans, now) — manual recompute   │ │
│  │  setNow(Date.now()) — 60fps clock tick                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **RemoteVisualStatePanel**
   - Iterates `remoteState.displayRows[]`
   - Renders `RemoteStackBlockItem` per row
   - Each item calls `calculateElapsedFromSpans(entry.timer.spans, now)`
   - Renders `<FragmentSourceRow fragments={entry.rows[i]} />` (shared!)

2. **TimerStackView** (shared with Track Panel!)
   - Receives props: `primaryTimer`, `secondaryTimers`, `timerStates` Map
   - Purely presentational — renders SVG ring, formatted time, buttons

3. **Local RAF Loop**
   - Always-running `requestAnimationFrame` → `setNow(Date.now())`
   - No smart gating — ticks every frame regardless of running state

**Problem:** `RemoteStackBlockItem` duplicates the logic of `StackBlockItem`, but operates on different data structures. Changes to UI must be manually replicated in both places.

---

### 1.4 Component Diagram — Memory Subscription Flow (Track Panel)

```
┌────────────────────────────────────────────────────────────────┐
│  StackBlockItem (Track Panel Component)                       │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  useEffect(() => {                                             │
│    const displayLocs = block.getFragmentMemoryByVisibility()   │
│    const unsubscribes = displayLocs.map(loc =>                 │
│      loc.subscribe(() => setFragmentRows(...))                 │
│    )                                                           │
│    return () => unsubscribes.forEach(fn => fn())              │
│  }, [block])                                                   │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  IRuntimeBlock.getFragmentMemoryByVisibility('display')        │
│    → IMemoryLocation[]                                         │
│                                                                │
│  IMemoryLocation {                                             │
│    fragments: ICodeFragment[]                                  │
│    subscribe(cb: () => void): () => void                       │
│    update(fragments: ICodeFragment[]): void                    │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Component subscribes to `IMemoryLocation` instances
2. Memory updates trigger callback → component re-renders
3. Component reads `loc.fragments` to get current data
4. Unsubscribe on unmount

**Problem:** This pattern is tightly coupled to `IRuntimeBlock` — cannot be used with serialized data.

---

## 2. The Abstraction Gap

### 2.1 What Works Today

| Aspect | Track Panel | Chromecast |
|--------|-------------|------------|
| TimerStackView | ✅ Shared component | ✅ Shared component |
| FragmentSourceRow | ✅ Shared component | ✅ Shared component |
| Timer elapsed computation | ✅ `calculateDuration()` | ✅ `calculateElapsedFromSpans()` (same algorithm) |

### 2.2 The Duplication Problem

| Component | Track Panel | Chromecast | Shared? |
|-----------|-------------|------------|---------|
| **Stack Visualization** | `StackBlockItem` | `RemoteStackBlockItem` | ❌ Duplicated |
| **Data Source** | `IRuntimeBlock` + memory subs | `RemoteDisplayRow` JSON | ❌ Incompatible |
| **Fragment Rows** | `block.getFragmentMemoryByVisibility()` | `entry.rows: any[][]` | ❌ Different APIs |
| **Timer Binding** | `useTimerElapsed(blockKey)` | `calculateElapsedFromSpans(entry.timer.spans, now)` | ❌ Different patterns |
| **Reactivity** | Memory location `.subscribe()` | `useState` + WebSocket updates | ❌ Different mechanisms |

### 2.3 Why This Matters

**Maintenance Burden:**
- Bug fixes must be applied twice (e.g., timer formatting, label resolution)
- Visual design changes require updating both components
- Feature additions (e.g., new fragment types) need dual implementation

**Type Safety:**
- Track Panel uses strongly-typed `IRuntimeBlock` interfaces
- Chromecast uses `any[][]` for serialized fragments
- Impossible to refactor with confidence

**Functional Parity Risk:**
- Track Panel supports dynamic button discovery via `useActiveControls()`
- Chromecast hardcodes D-Pad key mappings
- Future features (e.g., custom workout actions) won't work on Chromecast

---

## 3. Proposed Architecture (C4 Diagrams)

### 3.1 Context Diagram — Proposed State

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WOD Wiki System (Unified)                      │
│                                                                     │
│  ┌────────────────────┐              ┌────────────────────────┐    │
│  │   Workbench UI     │              │  Chromecast Receiver   │    │
│  │  (Track Panel)     │              │     (TV Display)       │    │
│  │                    │              │                        │    │
│  │  SAME COMPONENTS   │◄─────────────│   SAME COMPONENTS      │    │
│  │  • StackBlockItem  │              │   • StackBlockItem     │    │
│  │  • TimerDisplay    │              │   • TimerDisplay       │    │
│  └─────────┬──────────┘              └──────────┬─────────────┘    │
│            │                                    │                  │
│            ▼                                    ▼                  │
│  ┌──────────────────────────┐        ┌─────────────────────────┐  │
│  │ IWorkoutDisplayModel     │        │ IWorkoutDisplayModel    │  │
│  │   (Local Provider)       │        │  (Remote Provider)      │  │
│  │                          │        │                         │  │
│  │ • Wraps IRuntimeBlock    │        │ • Wraps RemoteState     │  │
│  │ • Memory subscriptions   │        │ • WebSocket updates     │  │
│  └────────────┬─────────────┘        └──────────┬──────────────┘  │
│               │                                  │                 │
│               ▼                                  ▼                 │
│  ┌─────────────────────┐              ┌────────────────────────┐  │
│  │  ScriptRuntime      │              │  WebRTC Transport      │  │
│  │  • RuntimeStack     │◄─────────────│  • Cast Signaling      │  │
│  │  • IRuntimeBlock[]  │  Serialize   │  • DataChannel msgs    │  │
│  └─────────────────────┘              └────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                          ▲
         │                                          │
    User Input                                 D-Pad Remote
```

**Key Change:** Both environments provide `IWorkoutDisplayModel` — components consume identical interface.

---

### 3.2 Container Diagram — Unified Track Panel

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Track Panel (Unified Architecture)                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │       <WorkoutDisplayProvider> (NEW)                           │ │
│  │       Provides: IWorkoutDisplayModel to all children           │ │
│  │                                                                │ │
│  │       Implementation: LocalWorkoutDisplayModel                 │ │
│  │       - Wraps ScriptRuntime + RuntimeStack                     │ │
│  │       - Exposes: blocks, timers, controls, lookahead           │ │
│  │       - Reactive: uses runtime memory subscriptions            │ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                         │                                           │
│    ┌────────────────────┼─────────────────────────┐                 │
│    │                    │                         │                 │
│    ▼                    ▼                         ▼                 │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐ │
│  │ Visual State │  │ Timer Display │  │  DisplaySyncBridge      │ │
│  │    Panel     │  │               │  │  (Chromecast Sync)      │ │
│  └───────┬──────┘  └───────┬───────┘  └────────┬────────────────┘ │
│          │                 │                    │                  │
│          ▼                 ▼                    ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │       useWorkoutDisplay() Hook                               │ │
│  │       Returns: {                                             │ │
│  │         blocks: IBlockDisplayModel[]                         │ │
│  │         timers: ITimerDisplayModel[]                         │ │
│  │         controls: IControlDisplayModel[]                     │ │
│  │         lookahead: ILookaheadDisplayModel | null             │ │
│  │       }                                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Changes:**

1. **WorkoutDisplayProvider** replaces direct `ScriptRuntimeProvider` access
   - Components consume `useWorkoutDisplay()` instead of `useScriptRuntime()`
   - Provider internally uses runtime but hides implementation details

2. **Display Model Interfaces** (new abstraction layer)
   - `IBlockDisplayModel` — per-block data with fragments, timer, label
   - `ITimerDisplayModel` — timer data with spans, elapsed, role
   - `IControlDisplayModel` — button configs with visibility, enabled state

3. **DisplaySyncBridge** becomes trivial
   - Calls `useWorkoutDisplay()` to get models
   - Serializes models to JSON (models already designed for serialization)
   - No logic duplication — bridge is pure data transformation

---

### 3.3 Container Diagram — Unified Chromecast Receiver

```
┌──────────────────────────────────────────────────────────────────────┐
│              Chromecast Receiver App (Unified)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  WebRTC DataChannel (via Cast Receiver SDK)                   │ │
│  │  Receives: { type: 'state-update', payload: { displayState } }│ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │       <WorkoutDisplayProvider> (NEW)                           │ │
│  │       Provides: IWorkoutDisplayModel to all children           │ │
│  │                                                                │ │
│  │       Implementation: RemoteWorkoutDisplayModel                │ │
│  │       - Wraps useState<RemoteState>                            │ │
│  │       - Exposes: blocks, timers, controls, lookahead           │ │
│  │       - Reactive: updates on WebSocket message                 │ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                         │                                           │
│        ┌────────────────┼─────────────────────┐                     │
│        │                │                     │                     │
│        ▼                ▼                     ▼                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐         │
│  │ Visual State │  │  Timer Display│  │ requestAnimation│         │
│  │   Panel      │  │               │  │ Frame (RAF)     │         │
│  │  (SHARED!)   │  │  (SHARED!)    │  │                 │         │
│  └───────┬──────┘  └───────┬───────┘  └─────────┬───────┘         │
│          │                 │                     │                 │
│          ▼                 ▼                     ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │       useWorkoutDisplay() Hook                               │ │
│  │       Returns: {                                             │ │
│  │         blocks: IBlockDisplayModel[]  (from RemoteState)     │ │
│  │         timers: ITimerDisplayModel[]                         │ │
│  │         controls: IControlDisplayModel[]                     │ │
│  │         lookahead: ILookaheadDisplayModel | null             │ │
│  │       }                                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Changes:**

1. **Same WorkoutDisplayProvider interface**, different implementation
   - `RemoteWorkoutDisplayModel` wraps `useState<RemoteState>`
   - Updates trigger on WebSocket message, not memory subscription
   - Exposes identical model shapes to Track Panel

2. **Same React components**
   - `VisualStatePanel` → `RuntimeStackView` → `StackBlockItem`
   - No more `RemoteStackBlockItem` — deleted entirely
   - All hooks work identically: `useWorkoutDisplay()` is environment-agnostic

3. **RAF Loop** remains the same
   - Still runs `requestAnimationFrame` for smooth timer interpolation
   - But now models expose consistent elapsed values, computed in provider

---

### 3.4 Component Diagram — Unified Display Model Flow

```
┌────────────────────────────────────────────────────────────────┐
│  StackBlockItem (Unified Component)                            │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  const { blocks } = useWorkoutDisplay()                        │
│  const block = blocks[index]  // IBlockDisplayModel            │
│                                                                │
│  // All data pre-computed by provider                          │
│  const fragments = block.fragmentRows                          │
│  const elapsed = block.timer?.elapsed ?? 0                     │
│  const label = block.label                                     │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  IWorkoutDisplayModel (interface)                              │
│    ├─► LocalWorkoutDisplayModel (Track Panel)                  │
│    │    → reads IRuntimeBlock memory                           │
│    │    → subscribes to memory locations                       │
│    │    → runs requestAnimationFrame when running              │
│    │                                                           │
│    └─► RemoteWorkoutDisplayModel (Chromecast)                  │
│         → reads RemoteState JSON                               │
│         → updates on WebSocket message                         │
│         → runs requestAnimationFrame always                    │
└────────────────────────────────────────────────────────────────┘
```

**Key Benefit:** Components are **pure view code** — no knowledge of data source.

---

## 4. Implementation: Before & After Code Examples

### 4.1 Display Model Interfaces (New)

```typescript
// src/runtime/display/IWorkoutDisplayModel.ts

import { ICodeFragment } from '@/core/models/CodeFragment';

/**
 * Per-block display data, transport-agnostic.
 */
export interface IBlockDisplayModel {
  /** Stable identifier for this block */
  readonly key: string;

  /** Block type for rendering (Timer, Rounds, Effort, etc.) */
  readonly blockType?: string;

  /** Human-readable label */
  readonly label: string;

  /** Whether this is the leaf (top-of-stack) block */
  readonly isLeaf: boolean;

  /** Depth in stack (0 = root, 1 = first child, etc.) */
  readonly depth: number;

  /** Fragment rows for display tier */
  readonly fragmentRows: ICodeFragment[][];

  /** Timer data if this block has a timer */
  readonly timer?: {
    readonly elapsed: number;          // Computed by provider
    readonly durationMs?: number;
    readonly direction: 'up' | 'down';
    readonly isRunning: boolean;
  };
}

/**
 * Per-timer display data for the big clock.
 */
export interface ITimerDisplayModel {
  readonly id: string;
  readonly ownerId: string;             // Block key
  readonly label: string;
  readonly format: 'up' | 'down';
  readonly durationMs?: number;
  readonly role: 'primary' | 'secondary';
  readonly elapsed: number;             // Computed by provider
  readonly isRunning: boolean;
  readonly isPinned?: boolean;
}

/**
 * Control button display data.
 */
export interface IControlDisplayModel {
  readonly id: string;
  readonly label: string;
  readonly eventName?: string;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly isPinned: boolean;
}

/**
 * Lookahead (next block preview) display data.
 */
export interface ILookaheadDisplayModel {
  readonly fragments: ICodeFragment[];
}

/**
 * Root display model — provides all UI data.
 */
export interface IWorkoutDisplayModel {
  /** All blocks on the stack (root → leaf order) */
  readonly blocks: IBlockDisplayModel[];

  /** All timers (primary first, then secondaries) */
  readonly timers: ITimerDisplayModel[];

  /** Active control buttons */
  readonly controls: IControlDisplayModel[];

  /** Next block preview (null if at end) */
  readonly lookahead: ILookaheadDisplayModel | null;

  /** Derived sub-label for clock display */
  readonly subLabel?: string;

  /** Overall workout state */
  readonly workoutState: 'idle' | 'running' | 'paused' | 'completed';
}
```

**Key Properties:**
- All models are **immutable** (readonly)
- All computed values (elapsed) are **pre-calculated** by provider
- All types are **serializable** (no functions, no classes)

---

### 4.2 Local Provider Implementation

```typescript
// src/runtime/display/LocalWorkoutDisplayModel.tsx

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useScriptRuntime } from '../context/RuntimeContext';
import { useSnapshotBlocks } from '../hooks/useStackSnapshot';
import { usePrimaryTimer, useSecondaryTimers, useStackTimers } from '../hooks/useStackDisplay';
import { useActiveControls } from '../hooks/useStackDisplay';
import { useNextPreview } from '../hooks/useNextPreview';
import { calculateDuration } from '@/lib/timeUtils';
import { IWorkoutDisplayModel, IBlockDisplayModel, ITimerDisplayModel } from './IWorkoutDisplayModel';

const WorkoutDisplayContext = createContext<IWorkoutDisplayModel | null>(null);

export const LocalWorkoutDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const runtime = useScriptRuntime();
  const blocks = useSnapshotBlocks();
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const activeControls = useActiveControls();
  const nextPreview = useNextPreview();

  // Subscribe to fragment memory changes
  const [fragmentVersion, setFragmentVersion] = useState(0);
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    for (const block of blocks) {
      const displayLocs = block.getFragmentMemoryByVisibility('display');
      for (const loc of displayLocs) {
        unsubscribes.push(loc.subscribe(() => setFragmentVersion(v => v + 1)));
      }
    }
    return () => unsubscribes.forEach(fn => fn());
  }, [blocks]);

  // RAF for smooth timer interpolation
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const isRunning = allTimers.some(t => t.timer.spans.some(s => s.ended === undefined));
    if (!isRunning) return;

    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, [allTimers]);

  const model = useMemo<IWorkoutDisplayModel>(() => {
    // Build block models
    const orderedBlocks = [...blocks].reverse(); // root → leaf
    const blockModels: IBlockDisplayModel[] = orderedBlocks.map((block, index) => {
      const timerEntry = allTimers.find(t => t.block.key.toString() === block.key.toString());
      const displayLocs = block.getFragmentMemoryByVisibility('display');

      return {
        key: block.key.toString(),
        blockType: block.blockType,
        label: block.label,
        isLeaf: index === orderedBlocks.length - 1,
        depth: index,
        fragmentRows: displayLocs.map(loc => loc.fragments),
        timer: timerEntry ? {
          elapsed: calculateDuration(timerEntry.timer.spans, now),
          durationMs: timerEntry.timer.durationMs,
          direction: timerEntry.timer.direction,
          isRunning: timerEntry.timer.spans.some(s => s.ended === undefined),
        } : undefined,
      };
    });

    // Build timer models
    const timerModels: ITimerDisplayModel[] = [
      ...(primaryTimerEntry ? [{
        id: `timer-${primaryTimerEntry.block.key}`,
        ownerId: primaryTimerEntry.block.key.toString(),
        label: primaryTimerEntry.timer.label,
        format: primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: 'primary' as const,
        elapsed: calculateDuration(primaryTimerEntry.timer.spans, now),
        isRunning: primaryTimerEntry.timer.spans.some(s => s.ended === undefined),
        isPinned: primaryTimerEntry.isPinned,
      }] : []),
      ...secondaryTimers.map(t => ({
        id: `timer-${t.block.key}`,
        ownerId: t.block.key.toString(),
        label: t.timer.label,
        format: t.timer.direction,
        durationMs: t.timer.durationMs,
        role: 'secondary' as const,
        elapsed: calculateDuration(t.timer.spans, now),
        isRunning: t.timer.spans.some(s => s.ended === undefined),
        isPinned: t.isPinned,
      }))
    ];

    // Build control models
    const controlModels = activeControls.map(c => ({
      id: c.id,
      label: c.label,
      eventName: c.eventName,
      visible: c.visible,
      enabled: c.enabled,
      isPinned: c.isPinned,
    }));

    // Build lookahead model
    const lookaheadModel = nextPreview ? {
      fragments: nextPreview.fragments,
    } : null;

    // Derive sub-label
    let subLabel: string | undefined;
    const leafItem = blockModels.find(b => b.isLeaf);
    const roundsItem = blockModels.find(b => b.blockType === 'Rounds');
    if (primaryTimerEntry?.isPinned) {
      const resolvedMainLabel = roundsItem?.label || primaryTimerEntry.timer.label;
      if (resolvedMainLabel !== leafItem?.label) {
        subLabel = leafItem?.label;
      }
    } else if (roundsItem && roundsItem.label !== leafItem?.label) {
      subLabel = leafItem?.label;
    }

    return {
      blocks: blockModels,
      timers: timerModels,
      controls: controlModels,
      lookahead: lookaheadModel,
      subLabel,
      workoutState: runtime?.state || 'idle',
    };
  }, [blocks, primaryTimerEntry, secondaryTimers, allTimers, activeControls, nextPreview, fragmentVersion, now, runtime]);

  return (
    <WorkoutDisplayContext.Provider value={model}>
      {children}
    </WorkoutDisplayContext.Provider>
  );
};

export const useWorkoutDisplay = (): IWorkoutDisplayModel => {
  const context = useContext(WorkoutDisplayContext);
  if (!context) {
    throw new Error('useWorkoutDisplay must be used within WorkoutDisplayProvider');
  }
  return context;
};
```

**Key Points:**
- **Zero logic duplication** — uses existing hooks internally
- **Pre-computes all derived values** (elapsed, sub-label)
- **Reactive** — subscribes to memory and triggers re-render on changes
- **Performance** — RAF runs only when timers are active

---

### 4.3 Remote Provider Implementation

```typescript
// src/runtime/display/RemoteWorkoutDisplayModel.tsx

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { IWorkoutDisplayModel, IBlockDisplayModel, ITimerDisplayModel } from './IWorkoutDisplayModel';

interface RemoteState {
  timerStack: any[];
  displayRows: any[];
  lookahead: { fragments: any[] } | null;
  subLabel?: string;
  workoutState: string;
}

function calculateElapsedFromSpans(spans: any[] | undefined, now: number): number {
  if (!spans || spans.length === 0) return 0;
  return spans.reduce((total, span) => {
    const end = span.ended ?? now;
    return total + Math.max(0, end - span.started);
  }, 0);
}

const WorkoutDisplayContext = createContext<IWorkoutDisplayModel | null>(null);

export const RemoteWorkoutDisplayProvider: React.FC<{
  remoteState: RemoteState | null;
  children: React.ReactNode;
}> = ({ remoteState, children }) => {
  // RAF for smooth timer interpolation
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const model = useMemo<IWorkoutDisplayModel>(() => {
    if (!remoteState) {
      return {
        blocks: [],
        timers: [],
        controls: [],
        lookahead: null,
        workoutState: 'idle',
      };
    }

    // Build block models from displayRows
    const blockModels: IBlockDisplayModel[] = remoteState.displayRows.map(row => ({
      key: row.blockKey,
      blockType: row.blockType,
      label: row.label,
      isLeaf: row.isLeaf,
      depth: row.depth,
      fragmentRows: row.rows,
      timer: row.timer ? {
        elapsed: calculateElapsedFromSpans(row.timer.spans, now),
        durationMs: row.timer.durationMs,
        direction: row.timer.direction,
        isRunning: row.timer.isRunning,
      } : undefined,
    }));

    // Build timer models from timerStack
    const timerModels: ITimerDisplayModel[] = remoteState.timerStack.map(t => ({
      id: t.id,
      ownerId: t.ownerId,
      label: t.label,
      format: t.format,
      durationMs: t.durationMs,
      role: t.role,
      elapsed: calculateElapsedFromSpans(t.spans, now),
      isRunning: t.isRunning,
      isPinned: t.isPinned,
    }));

    // Controls are not transmitted — use empty array for now
    const controlModels = [];

    // Lookahead
    const lookaheadModel = remoteState.lookahead ? {
      fragments: remoteState.lookahead.fragments,
    } : null;

    return {
      blocks: blockModels,
      timers: timerModels,
      controls: controlModels,
      lookahead: lookaheadModel,
      subLabel: remoteState.subLabel,
      workoutState: remoteState.workoutState,
    };
  }, [remoteState, now]);

  return (
    <WorkoutDisplayContext.Provider value={model}>
      {children}
    </WorkoutDisplayContext.Provider>
  );
};

export const useWorkoutDisplay = (): IWorkoutDisplayModel => {
  const context = useContext(WorkoutDisplayContext);
  if (!context) {
    throw new Error('useWorkoutDisplay must be used within WorkoutDisplayProvider');
  }
  return context;
};
```

**Key Points:**
- **Same interface** as LocalWorkoutDisplayModel
- **Maps RemoteState** to display models
- **Re-computes elapsed** each frame from spans
- **No duplicated logic** — transformation is pure data mapping

---

### 4.4 Unified Component — StackBlockItem (Before)

**Track Panel Version (src/components/track/VisualStateComponents.tsx):**

```typescript
// BEFORE — Track Panel only
const StackBlockItem: React.FC<{
  block: IRuntimeBlock;
  index: number;
  isLeaf: boolean;
  isRoot: boolean;
  debug?: boolean;
}> = ({ block, index, isLeaf, isRoot, debug }) => {
  const { elapsed, isRunning } = useTimerElapsed(block.key.toString());
  const [displayRows, setDisplayRows] = useState<ICodeFragment[][]>([]);

  // Subscribe to fragment memory
  useEffect(() => {
    const displayLocs = block.getFragmentMemoryByVisibility('display');
    setDisplayRows(displayLocs.map(loc => loc.fragments));

    const unsubscribes = displayLocs.map(loc =>
      loc.subscribe(() => setDisplayRows(displayLocs.map(l => l.fragments)))
    );
    return () => unsubscribes.forEach(fn => fn());
  }, [block]);

  return (
    <div className={cn("rounded-md border", isLeaf && "bg-card shadow-sm")}>
      <div className="flex items-center justify-between p-3">
        <span className="font-semibold">{block.label}</span>
        {elapsed > 0 && (
          <div className={cn("font-mono text-xs", isRunning && "animate-pulse")}>
            <Timer className="h-3 w-3" />
            {formatTimeMMSS(elapsed)}
          </div>
        )}
      </div>
      {displayRows.map((row, idx) => (
        <FragmentSourceRow key={idx} fragments={row} size="compact" />
      ))}
    </div>
  );
};
```

**Chromecast Version (src/receiver-main.tsx):**

```typescript
// BEFORE — Chromecast only (DUPLICATED LOGIC)
const RemoteStackBlockItem: React.FC<{
  entry: RemoteDisplayRow;
  localNow: number;
}> = ({ entry, localNow }) => {
  const hasTimer = !!entry.timer;
  const elapsed = hasTimer ? calculateElapsedFromSpans(entry.timer!.spans, localNow) : 0;

  return (
    <div className={cn("rounded-md border", entry.isLeaf && "bg-card shadow-sm")}>
      <div className="flex items-center justify-between p-3">
        <span className="font-semibold">{entry.label}</span>
        {hasTimer && (
          <div className={cn("font-mono text-xs", entry.timer?.isRunning && "animate-pulse")}>
            <Timer className="h-3 w-3" />
            {formatTimeMMSS(elapsed)}
          </div>
        )}
      </div>
      {entry.rows.map((row, idx) => (
        <FragmentSourceRow key={idx} fragments={row} size="compact" />
      ))}
    </div>
  );
};
```

**Problem:** Visual logic is identical, but data binding is completely different.

---

### 4.5 Unified Component — StackBlockItem (After)

**Unified Version (src/components/track/VisualStateComponents.tsx):**

```typescript
// AFTER — Works in both environments!
const StackBlockItem: React.FC<{
  block: IBlockDisplayModel;  // Changed from IRuntimeBlock
  debug?: boolean;
}> = ({ block, debug }) => {
  // All data pre-computed by provider — no subscriptions needed!
  const elapsed = block.timer?.elapsed ?? 0;
  const isRunning = block.timer?.isRunning ?? false;

  return (
    <div className={cn("rounded-md border", block.isLeaf && "bg-card shadow-sm")}>
      <div className="flex items-center justify-between p-3">
        <span className="font-semibold">{block.label}</span>
        {elapsed > 0 && (
          <div className={cn("font-mono text-xs", isRunning && "animate-pulse")}>
            <Timer className="h-3 w-3" />
            {formatTimeMMSS(elapsed)}
          </div>
        )}
      </div>
      {block.fragmentRows.map((row, idx) => (
        <FragmentSourceRow key={idx} fragments={row} size="compact" />
      ))}
    </div>
  );
};

export const RuntimeStackView: React.FC<{ debug?: boolean }> = ({ debug }) => {
  const { blocks } = useWorkoutDisplay(); // Works in both environments!

  return (
    <div className="flex flex-col gap-1">
      {blocks.map((block, index) => (
        <StackBlockItem
          key={block.key}
          block={block}
          debug={debug}
        />
      ))}
    </div>
  );
};
```

**Key Changes:**
- `block: IRuntimeBlock` → `block: IBlockDisplayModel`
- No `useTimerElapsed()` hook — elapsed is pre-computed
- No `useEffect` subscriptions — provider handles reactivity
- **RemoteStackBlockItem deleted entirely** — no longer needed!

---

### 4.6 Unified Component — TimerDisplay (Before)

**Track Panel Version:**

```typescript
// BEFORE — Track Panel only
const StackIntegratedTimer: React.FC<TimerDisplayProps> = (props) => {
  const runtime = useScriptRuntime();
  const primaryTimer = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const stackItems = useStackDisplayRows();

  const [now, setNow] = useState(Date.now());
  const isAnyTimerRunning = useMemo(() => {
    return allTimers.some(t => t.timer.spans.some(s => s.ended === undefined));
  }, [allTimers]);

  useEffect(() => {
    if (!isAnyTimerRunning) return;
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, [isAnyTimerRunning]);

  const timerStates = useMemo(() => {
    const map = new Map();
    for (const entry of allTimers) {
      map.set(entry.block.key.toString(), {
        elapsed: calculateDuration(entry.timer.spans, now),
        duration: entry.timer.durationMs,
        format: entry.timer.direction,
      });
    }
    return map;
  }, [allTimers, now]);

  const primaryElapsed = primaryTimer
    ? calculateDuration(primaryTimer.timer.spans, now)
    : 0;

  // Derive sub-label from stack
  let subLabel: string | undefined;
  const leafItem = stackItems?.find(i => i.isLeaf);
  const roundsItem = stackItems?.find(i => i.block.blockType === 'Rounds');
  if (primaryTimer?.isPinned) {
    const resolvedMainLabel = roundsItem?.label || primaryTimer.timer.label;
    if (resolvedMainLabel !== leafItem?.label) {
      subLabel = leafItem?.label;
    }
  } else if (roundsItem && roundsItem.label !== leafItem?.label) {
    subLabel = leafItem?.label;
  }

  return (
    <TimerStackView
      elapsedMs={primaryElapsed}
      hasActiveBlock={!!primaryTimer}
      primaryTimer={primaryTimer ? {
        id: `timer-${primaryTimer.block.key}`,
        ownerId: primaryTimer.block.key.toString(),
        label: primaryTimer.timer.label,
        format: primaryTimer.timer.direction,
        durationMs: primaryTimer.timer.durationMs,
        role: primaryTimer.isPinned ? 'primary' : 'auto',
        accumulatedMs: primaryElapsed,
      } : undefined}
      subLabel={subLabel}
      secondaryTimers={secondaryTimers.map(t => ({ ... }))}
      timerStates={timerStates}
      {...props}
    />
  );
};
```

**Chromecast Version:**

```typescript
// BEFORE — Chromecast (DUPLICATED LOGIC)
const ReceiverApp = () => {
  const [remoteState, setRemoteState] = useState<RemoteState | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const timerStack = remoteState?.timerStack || [];
  const primary = timerStack.find(t => t.role === 'primary') || timerStack[0];
  const secondaries = timerStack.filter(t => t !== primary);

  const primaryElapsed = primary ? calculateElapsedFromSpans(primary.spans, now) : 0;

  const timerStates = useMemo(() => {
    const map = new Map();
    for (const t of timerStack) {
      map.set(t.ownerId, {
        elapsed: calculateElapsedFromSpans(t.spans, now),
        duration: t.durationMs,
        format: t.format,
      });
    }
    return map;
  }, [timerStack, now]);

  return (
    <TimerStackView
      elapsedMs={primaryElapsed}
      hasActiveBlock={!!primary}
      primaryTimer={primary ? { ... } : undefined}
      subLabel={remoteState?.subLabel}
      secondaryTimers={secondaries.map(t => ({ ... }))}
      timerStates={timerStates}
      {...}
    />
  );
};
```

**Problem:** Both compute the same `timerStates` Map and derive the same sub-label logic.

---

### 4.7 Unified Component — TimerDisplay (After)

**Unified Version:**

```typescript
// AFTER — Works in both environments!
const StackIntegratedTimer: React.FC<TimerDisplayProps> = (props) => {
  const { timers, subLabel } = useWorkoutDisplay(); // Works everywhere!

  const primaryTimer = timers.find(t => t.role === 'primary') || timers[0];
  const secondaryTimers = timers.filter(t => t !== primaryTimer);

  // Build timerStates map — elapsed already computed by provider!
  const timerStates = useMemo(() => {
    const map = new Map();
    for (const timer of timers) {
      map.set(timer.ownerId, {
        elapsed: timer.elapsed,  // Pre-computed!
        duration: timer.durationMs,
        format: timer.format,
      });
    }
    return map;
  }, [timers]);

  return (
    <TimerStackView
      elapsedMs={primaryTimer?.elapsed ?? 0}
      hasActiveBlock={!!primaryTimer}
      primaryTimer={primaryTimer ? {
        id: primaryTimer.id,
        ownerId: primaryTimer.ownerId,
        label: primaryTimer.label,
        format: primaryTimer.format,
        durationMs: primaryTimer.durationMs,
        role: primaryTimer.isPinned ? 'primary' : 'auto',
        accumulatedMs: primaryTimer.elapsed,
      } : undefined}
      subLabel={subLabel}  // Pre-computed by provider!
      secondaryTimers={secondaryTimers.map(t => ({
        id: t.id,
        ownerId: t.ownerId,
        label: t.label,
        format: t.format,
        durationMs: t.durationMs,
        role: 'auto',
        accumulatedMs: t.elapsed,
      }))}
      timerStates={timerStates}
      {...props}
    />
  );
};
```

**Key Changes:**
- No `useScriptRuntime()`, `usePrimaryTimer()`, etc. — all via `useWorkoutDisplay()`
- No RAF loop — provider handles it
- No sub-label derivation — provider handles it
- **Identical code** works in Track Panel and Chromecast!

---

## 5. Migration Path

### 5.1 Phase 1: Introduce Display Model Interfaces (Non-Breaking)

**Steps:**
1. Create `src/runtime/display/IWorkoutDisplayModel.ts` with all interfaces
2. Create `src/runtime/display/LocalWorkoutDisplayModel.tsx` provider
3. Add `<LocalWorkoutDisplayProvider>` **inside** existing `<ScriptRuntimeProvider>` in TrackPanel
4. Export `useWorkoutDisplay()` hook alongside existing hooks

**Impact:** Zero — existing code continues using old hooks, new provider is inactive.

**Validation:**
- Run `bun run test` — no test failures
- Run `bun run storybook` — TrackPanel still works

---

### 5.2 Phase 2: Migrate VisualStatePanel (Track Panel Only)

**Steps:**
1. Update `StackBlockItem` to accept `IBlockDisplayModel` instead of `IRuntimeBlock`
2. Update `RuntimeStackView` to call `useWorkoutDisplay()` instead of direct stack access
3. Update `LookaheadView` to read `lookahead` from `useWorkoutDisplay()`
4. Test in Storybook — verify fragments, timers, labels render identically

**Impact:** Track Panel behavior unchanged, but now uses display model layer.

**Validation:**
- Run `bun run test` — existing tests still pass
- Run `bun run storybook` → Clock > Default story — verify visual parity
- Test fragment updates, timer ticking, round label updates

---

### 5.3 Phase 3: Migrate TimerDisplay (Track Panel Only)

**Steps:**
1. Update `StackIntegratedTimer` to call `useWorkoutDisplay()` for timers/sub-label
2. Remove direct calls to `usePrimaryTimer()`, `useSecondaryTimers()`, etc.
3. Test timer pin resolution, sub-label derivation

**Impact:** Track Panel timer display unchanged.

**Validation:**
- Run `bun run test` — timer tests pass
- Run `bun run storybook` — big clock renders identically
- Test primary/secondary timer switching, AMRAP timer pinning

---

### 5.4 Phase 4: Update DisplaySyncBridge (Track Panel Only)

**Steps:**
1. Update `DisplaySyncBridge` to call `useWorkoutDisplay()` instead of direct hooks
2. Serialize `IBlockDisplayModel[]` → `RemoteState.displayRows`
3. Serialize `ITimerDisplayModel[]` → `RemoteState.timerStack`
4. Verify WebSocket messages are byte-identical to Phase 3

**Impact:** Chromecast receives identical JSON — no visual change on TV.

**Validation:**
- Connect Chromecast, start workout
- Inspect WebSocket messages — verify `displayState` structure unchanged
- Verify Chromecast UI still renders correctly (uses old RemoteStackBlockItem)

---

### 5.5 Phase 5: Create RemoteWorkoutDisplayProvider (Chromecast)

**Steps:**
1. Create `src/runtime/display/RemoteWorkoutDisplayModel.tsx`
2. Wrap `ReceiverApp` with `<RemoteWorkoutDisplayProvider remoteState={remoteState}>`
3. **Do not yet replace components** — provider is inactive

**Impact:** Zero — Chromecast still uses old components.

**Validation:**
- Deploy receiver to Chromecast
- Verify no crashes, UI unchanged

---

### 5.6 Phase 6: Migrate Chromecast Components (Final Step)

**Steps:**
1. Replace `RemoteVisualStatePanel` with Track Panel's `VisualStatePanel`
2. Replace `RemoteStackBlockItem` with Track Panel's `StackBlockItem`
3. Update `ReceiverApp` to use unified `StackIntegratedTimer` instead of inline logic
4. **Delete** `RemoteStackBlockItem` entirely
5. **Delete** `RemoteVisualStatePanel` entirely

**Impact:** Chromecast now uses **identical React components** as Track Panel.

**Validation:**
- Deploy receiver to Chromecast
- Run full workout session
- Verify:
  - Block stack renders identically
  - Timers tick smoothly
  - Fragment rows display correctly
  - Sub-label resolves correctly
  - D-Pad events work (next, start, pause, stop)

---

### 5.7 Phase 7: Cleanup & Deprecation

**Steps:**
1. Mark old hooks as deprecated with JSDoc comments
   ```typescript
   /**
    * @deprecated Use useWorkoutDisplay() instead.
    * This hook will be removed in v2.0.
    */
   export function useStackDisplayRows() { ... }
   ```
2. Add migration guide to `docs/`
3. Schedule removal of deprecated hooks for next major version

**Impact:** Codebase fully migrated, ready for future extensions.

---

## 6. Validation & Testing Strategy

### 6.1 Unit Tests (New)

Create tests for display model providers:

```typescript
// src/runtime/display/__tests__/LocalWorkoutDisplayModel.test.ts

describe('LocalWorkoutDisplayModel', () => {
  it('should map runtime blocks to display models', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run\n5 Rounds')
      .build();

    const { result } = renderHook(() => useWorkoutDisplay(), {
      wrapper: ({ children }) => (
        <ScriptRuntimeProvider runtime={harness.runtime}>
          <LocalWorkoutDisplayProvider>
            {children}
          </LocalWorkoutDisplayProvider>
        </ScriptRuntimeProvider>
      ),
    });

    expect(result.current.blocks).toHaveLength(1); // Root block
    expect(result.current.blocks[0].label).toBe('For Time');
    expect(result.current.timers).toHaveLength(1);
  });

  it('should recompute elapsed on RAF tick', async () => {
    // Test timer interpolation
  });

  it('should derive sub-label from rounds + leaf', () => {
    // Test sub-label logic
  });
});
```

---

### 6.2 Integration Tests (Existing)

Update existing tests to use new provider:

```typescript
// src/components/track/__tests__/VisualStatePanel.test.ts

describe('VisualStatePanel', () => {
  it('should render stack blocks', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .build();

    const { getByText } = render(
      <ScriptRuntimeProvider runtime={harness.runtime}>
        <LocalWorkoutDisplayProvider>
          <VisualStatePanel />
        </LocalWorkoutDisplayProvider>
      </ScriptRuntimeProvider>
    );

    expect(getByText('Run')).toBeInTheDocument();
  });
});
```

---

### 6.3 Storybook Stories (Manual Validation)

Update stories to use new provider:

```typescript
// stories/track/VisualStatePanel.stories.tsx

export const Default: Story = {
  render: () => {
    const runtime = useRuntimeExecution('10:00 Run\n5 Rounds');
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <LocalWorkoutDisplayProvider>
          <VisualStatePanel />
        </LocalWorkoutDisplayProvider>
      </ScriptRuntimeProvider>
    );
  },
};
```

**Manual Validation Checklist:**
- [ ] Block stack renders in correct order (root → leaf)
- [ ] Leaf block has accent styling
- [ ] Per-block timers tick smoothly
- [ ] Fragment rows display correctly
- [ ] Round label updates reactively
- [ ] Lookahead shows next block preview
- [ ] Controls appear and respond to clicks

---

### 6.4 Chromecast End-to-End Test

**Test Protocol:**
1. Start Storybook with `bun run storybook`
2. Connect Chromecast device
3. Cast Clock story to TV
4. Run workout: `10:00 Run\n5 Rounds\n21-15-9 Thrusters`
5. Verify:
   - [ ] Stack blocks render on left panel
   - [ ] Big clock renders on right panel
   - [ ] Timers tick without lag
   - [ ] D-Pad "OK" advances to next segment
   - [ ] Round counter updates ("Round 1 of 5" → "Round 2 of 5")
   - [ ] Lookahead updates as segments complete
   - [ ] Sub-label displays leaf label when different from main label

---

## 7. Future Extensions

### 7.1 Dynamic Controls on Chromecast

With the unified model, we can now transmit `controls[]` to the receiver:

**Before (Current):**
- Chromecast has hardcoded D-Pad key mappings
- Custom workout actions (e.g., "Choose Weight") don't work

**After (Proposed):**
- `IWorkoutDisplayModel.controls` includes all active buttons
- Receiver renders on-screen controls alongside D-Pad mappings
- Custom actions can trigger via remote or on-screen UI

**Implementation:**
1. Update `DisplaySyncBridge` to serialize `useActiveControls()`
2. Update `RemoteWorkoutDisplayModel` to expose `controls[]`
3. Create `<RemoteControlPanel>` component for on-screen buttons
4. Map D-Pad keys to first 4 controls (Up/Down/Left/Right)

---

### 7.2 Multi-Display Sync

With the unified model, we can support multiple receivers:

**Use Case:** Athlete on Chromecast TV + Coach on tablet both viewing same workout.

**Implementation:**
1. `DisplaySyncBridge` already serializes full UI state
2. Create `CastButton` clone that connects to multiple receivers
3. Each receiver independently interpolates timers via local RAF
4. All receivers stay in sync via periodic snapshots (250ms fingerprint check)

---

### 7.3 Web-Based Receiver (No Chromecast Hardware)

With the unified model, we can create a browser-based receiver:

**Use Case:** User wants to display workout on laptop HDMI → external monitor.

**Implementation:**
1. Create new route `/receiver` in Workbench
2. Connect via WebSocket (same protocol as Chromecast)
3. Use `RemoteWorkoutDisplayProvider` with WebSocket transport
4. Render identical UI as Chromecast receiver

---

## Conclusion

This proposal introduces a **unified view model layer** that bridges the abstraction gap between the Track Panel and Chromecast Receiver, enabling:

1. **Code Reuse**: Identical React components for both environments
2. **Type Safety**: Strongly-typed interfaces replace `any[][]` serialization
3. **Maintainability**: Bug fixes and features apply to both displays automatically
4. **Extensibility**: Future features (dynamic controls, multi-display) become trivial

The migration path is **incremental and non-breaking**, allowing each phase to be validated independently before proceeding. All current Track Panel functionality is preserved with zero regression.

---

**Next Steps:**
1. Review this proposal with stakeholders
2. Approve Phase 1-7 migration plan
3. Begin implementation with Phase 1 (introduce interfaces)
4. Validate each phase with tests and Storybook before proceeding

**Questions?** Contact the WOD Wiki team or open a discussion issue.
