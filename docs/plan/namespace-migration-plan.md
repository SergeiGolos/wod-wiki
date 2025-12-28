# Namespace Migration Plan - Proposal 1 (Domain-Driven)

## Overview

This document provides a detailed implementation plan for reorganizing the WOD Wiki runtime namespace using the Domain-Driven approach. The migration is designed to be incremental, with each phase independently testable.

---

## Phase Summary

| Phase | Description | Risk | Duration |
|-------|-------------|------|----------|
| **Phase 0** | Preparation & Index Files | 🟢 Low | 1 day |
| **Phase 1** | Consolidate Interfaces into `contracts/` | 🟢 Low | 1-2 days |
| **Phase 2** | Consolidate Models (remove duplicates) | 🟡 Medium | 1 day |
| **Phase 3** | Move Fragments to `compiler/fragments/` | 🟡 Medium | 1 day |
| **Phase 4** | Reorganize Actions | 🟢 Low | 1 day |
| **Phase 5** | Extract Testing Infrastructure | 🟡 Medium | 1-2 days |
| **Phase 6** | Consolidate Events | 🟢 Low | 0.5 day |
| **Phase 7** | Update External Imports | 🟡 Medium | 1-2 days |
| **Phase 8** | Cleanup & Deprecation | 🟢 Low | 0.5 day |

**Total Estimated Duration: 8-11 days**

---

## Namespace Mapping Table

### Legend
- ✅ = File moves to new location
- 🔀 = File merges with another
- ❌ = File deleted (duplicate)
- 📝 = File renamed
- ➕ = New file created

---

## Phase 0: Preparation

### 0.1 Create Target Directory Structure

```powershell
# Create new directories
New-Item -ItemType Directory -Force -Path @(
    "src/runtime/contracts",
    "src/runtime/contracts/events",
    "src/runtime/core",
    "src/runtime/compiler",
    "src/runtime/compiler/strategies",
    "src/runtime/compiler/fragments",
    "src/runtime/events",
    "src/runtime/actions/stack",
    "src/runtime/actions/display",
    "src/runtime/actions/events",
    "src/runtime/actions/audio",
    "src/testing/harness",
    "src/testing/testable",
    "src/testing/setup"
)
```

### 0.2 Create Barrel Index Files

Create index.ts files in each new directory to enable clean re-exports during migration.

---

## Phase 1: Consolidate Interfaces into `contracts/`

### Mapping Table

| Current Path | New Path | Action |
|-------------|----------|--------|
| `src/runtime/IScriptRuntime.ts` | `src/runtime/contracts/IScriptRuntime.ts` | ✅ Move |
| `src/runtime/IRuntimeBlock.ts` | `src/runtime/contracts/IRuntimeBlock.ts` | ✅ Move |
| `src/runtime/IRuntimeAction.ts` | `src/runtime/contracts/IRuntimeAction.ts` | ✅ Move |
| `src/runtime/IRuntimeBehavior.ts` | `src/runtime/contracts/IRuntimeBehavior.ts` | ✅ Move |
| `src/runtime/IRuntimeMemory.ts` | `src/runtime/contracts/IRuntimeMemory.ts` | ✅ Move |
| `src/runtime/IRuntimeStack.ts` | `src/runtime/contracts/IRuntimeStack.ts` | ✅ Move |
| `src/runtime/IRuntimeClock.ts` | `src/runtime/contracts/IRuntimeClock.ts` | ✅ Move |
| `src/runtime/IRuntimeBlockStrategy.ts` | `src/runtime/contracts/IRuntimeBlockStrategy.ts` | ✅ Move |
| `src/runtime/IRuntimeOptions.ts` | `src/runtime/contracts/IRuntimeOptions.ts` | ✅ Move |
| `src/runtime/IBlockContext.ts` | `src/runtime/contracts/IBlockContext.ts` | ✅ Move |
| `src/runtime/IMemoryReference.ts` | `src/runtime/contracts/IMemoryReference.ts` | ✅ Move |
| `src/runtime/IAnchorValue.ts` | `src/runtime/contracts/IAnchorValue.ts` | ✅ Move |
| `src/runtime/IDistributedFragments.ts` | `src/runtime/contracts/IDistributedFragments.ts` | ✅ Move |
| `src/runtime/IEvent.ts` | `src/runtime/contracts/events/IEvent.ts` | ✅ Move |
| `src/runtime/IEventBus.ts` | `src/runtime/contracts/events/IEventBus.ts` | ✅ Move |
| `src/runtime/IEventHandler.ts` | `src/runtime/contracts/events/IEventHandler.ts` | ✅ Move |

### New Index File: `src/runtime/contracts/index.ts`

```typescript
// Core runtime interfaces
export type { IScriptRuntime } from './IScriptRuntime';
export type { IRuntimeBlock, BlockLifecycleOptions } from './IRuntimeBlock';
export type { IRuntimeAction } from './IRuntimeAction';
export type { IRuntimeBehavior } from './IRuntimeBehavior';
export type { IRuntimeMemory, MemorySearchCriteria, MemoryEventDispatcher, Nullable } from './IRuntimeMemory';
export type { IRuntimeStack } from './IRuntimeStack';
export type { IRuntimeClock } from './IRuntimeClock';
export type { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
export type { IRuntimeOptions, RuntimeStackOptions, RuntimeStackHooks, RuntimeStackLogger, RuntimeStackWrapper, RuntimeStackTracker, DebugLogEvent, DebugLogEventType, BlockWrapperFactory } from './IRuntimeOptions';
export type { IBlockContext } from './IBlockContext';
export type { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
export type { IAnchorValue } from './IAnchorValue';
export type { IDistributedFragments } from './IDistributedFragments';

// Event interfaces
export * from './events';
```

### New Index File: `src/runtime/contracts/events/index.ts`

```typescript
export type { IEvent } from './IEvent';
export type { IEventBus } from './IEventBus';
export type { IEventHandler } from './IEventHandler';
```

### Import Update Pattern

```typescript
// BEFORE
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { IRuntimeBlock } from '@/runtime/IRuntimeBlock';
import { IEvent } from '@/runtime/IEvent';

// AFTER
import { IScriptRuntime, IRuntimeBlock } from '@/runtime/contracts';
import { IEvent } from '@/runtime/contracts/events';
// OR
import type { IScriptRuntime, IRuntimeBlock, IEvent } from '@/runtime/contracts';
```

### Backward Compatibility Re-exports

Update `src/runtime/index.ts` to re-export from new location:

```typescript
// Backward compatibility - re-export from contracts
export type {
  IScriptRuntime,
  IRuntimeBlock,
  BlockLifecycleOptions,
  IRuntimeAction,
  IRuntimeBehavior,
  IRuntimeMemory,
  MemorySearchCriteria,
  IRuntimeStack,
  IRuntimeClock,
  IRuntimeBlockStrategy,
  IRuntimeOptions,
  IBlockContext,
  IMemoryReference,
  TypedMemoryReference,
  IEvent,
  IEventBus,
  IEventHandler,
} from './contracts';
```

### Search & Replace Patterns

```
# Find all imports of individual interface files
Search (regex): import\s*(?:type\s*)?\{\s*([^}]+)\s*\}\s*from\s*['"]@/runtime/(I[A-Z][a-zA-Z]+)['"]
Replace: import type { $1 } from '@/runtime/contracts'

# Specific patterns to run:
@/runtime/IScriptRuntime  →  @/runtime/contracts
@/runtime/IRuntimeBlock   →  @/runtime/contracts
@/runtime/IRuntimeAction  →  @/runtime/contracts
@/runtime/IRuntimeBehavior →  @/runtime/contracts
@/runtime/IRuntimeMemory  →  @/runtime/contracts
@/runtime/IRuntimeStack   →  @/runtime/contracts
@/runtime/IRuntimeClock   →  @/runtime/contracts
@/runtime/IRuntimeBlockStrategy →  @/runtime/contracts
@/runtime/IRuntimeOptions →  @/runtime/contracts
@/runtime/IBlockContext   →  @/runtime/contracts
@/runtime/IMemoryReference →  @/runtime/contracts
@/runtime/IEvent          →  @/runtime/contracts/events
@/runtime/IEventBus       →  @/runtime/contracts/events
@/runtime/IEventHandler   →  @/runtime/contracts/events
```

---

## Phase 2: Consolidate Models (Remove Duplicates)

### Duplicate Resolution

| Duplicate | Canonical Location | Files to Update |
|-----------|-------------------|-----------------|
| `TimeSpan` | `src/runtime/models/TimeSpan.ts` | Remove from `RuntimeMetric.ts` |
| `RuntimeSnapshot` | `src/testing/harness/types.ts` | Remove from `TestableRuntime.ts` |
| `MemoryEntry` | `src/runtime/models/MemoryModels.ts` | Remove from `runtime-test-bench/`, `tests/harness/` |

### Mapping Table

| Current Path | New Path | Action |
|-------------|----------|--------|
| `src/runtime/models/TimeSpan.ts` | `src/runtime/models/TimeSpan.ts` | Keep (canonical) |
| `src/runtime/RuntimeMetric.ts` (TimeSpan interface) | - | ❌ Remove duplicate, import from models |
| `src/runtime/models/RuntimeSpan.ts` | `src/runtime/models/RuntimeSpan.ts` | Keep |
| `src/runtime/models/MemoryModels.ts` | `src/runtime/models/MemoryModels.ts` | Keep (add MemoryEntry) |
| `src/runtime/models/SoundModels.ts` | `src/runtime/models/SoundModels.ts` | Keep |
| `src/runtime/MemoryTypeEnum.ts` | `src/runtime/models/MemoryTypeEnum.ts` | ✅ Move |
| `src/runtime/RuntimeMetric.ts` | `src/runtime/models/RuntimeMetric.ts` | ✅ Move |

### New Index File: `src/runtime/models/index.ts`

```typescript
export { TimeSpan } from './TimeSpan';
export type { RuntimeSpan, SpanStatus, SpanMetadata, TimerDisplayConfig } from './RuntimeSpan';
export type { RuntimeMetric, MetricEntry, MetricValue, MetricValueType } from './RuntimeMetric';
export type { RuntimeButton, RuntimeControls, MemoryEntry } from './MemoryModels';
export type { SoundCue, SoundCueState, SoundBehaviorConfig, SoundState, PredefinedSoundName } from './SoundModels';
export { PREDEFINED_SOUNDS } from './SoundModels';
export { MemoryTypeEnum } from './MemoryTypeEnum';
```

### Import Update Pattern

```typescript
// BEFORE
import { TimeSpan } from '@/runtime/RuntimeMetric';
import { RuntimeSpan } from '@/runtime/models/RuntimeSpan';

// AFTER
import { TimeSpan, RuntimeSpan } from '@/runtime/models';
```

---

## Phase 3: Move Fragments to `compiler/fragments/`

### Mapping Table

| Current Path | New Path | Action |
|-------------|----------|--------|
| `src/fragments/TimerFragment.ts` | `src/runtime/compiler/fragments/TimerFragment.ts` | ✅ Move |
| `src/fragments/EffortFragment.ts` | `src/runtime/compiler/fragments/EffortFragment.ts` | ✅ Move |
| `src/fragments/RoundsFragment.ts` | `src/runtime/compiler/fragments/RoundsFragment.ts` | ✅ Move |
| `src/fragments/RepFragment.ts` | `src/runtime/compiler/fragments/RepFragment.ts` | ✅ Move |
| `src/fragments/TextFragment.ts` | `src/runtime/compiler/fragments/TextFragment.ts` | ✅ Move |
| `src/fragments/DistanceFragment.ts` | `src/runtime/compiler/fragments/DistanceFragment.ts` | ✅ Move |
| `src/fragments/ResistanceFragment.ts` | `src/runtime/compiler/fragments/ResistanceFragment.ts` | ✅ Move |
| `src/fragments/IncrementFragment.ts` | `src/runtime/compiler/fragments/IncrementFragment.ts` | ✅ Move |
| `src/fragments/LapFragment.ts` | `src/runtime/compiler/fragments/LapFragment.ts` | ✅ Move |
| `src/fragments/ActionFragment.ts` | `src/runtime/compiler/fragments/ActionFragment.ts` | ✅ Move |
| `src/runtime/FragmentCompilationManager.ts` | `src/runtime/compiler/FragmentCompilationManager.ts` | ✅ Move |
| `src/runtime/FragmentCompilers.ts` | `src/runtime/compiler/FragmentCompilers.ts` | ✅ Move |
| `src/runtime/FragmentMetricCollector.ts` | `src/runtime/compiler/FragmentMetricCollector.ts` | ✅ Move |
| `src/runtime/JitCompiler.ts` | `src/runtime/compiler/JitCompiler.ts` | ✅ Move |
| `src/runtime/RuntimeFactory.ts` | `src/runtime/compiler/RuntimeFactory.ts` | ✅ Move |
| `src/runtime/RuntimeBuilder.ts` | `src/runtime/compiler/RuntimeBuilder.ts` | ✅ Move |
| `src/runtime/strategies/*.ts` | `src/runtime/compiler/strategies/*.ts` | ✅ Move all |

### New Index File: `src/runtime/compiler/index.ts`

```typescript
// JIT Compiler
export { JitCompiler } from './JitCompiler';
export { RuntimeFactory } from './RuntimeFactory';
export type { IRuntimeFactory } from './RuntimeFactory';
export { RuntimeBuilder } from './RuntimeBuilder';

// Fragment compilation
export { FragmentCompilationManager } from './FragmentCompilationManager';
export type { IFragmentCompiler } from './FragmentCompilationManager';
export { FragmentMetricCollector } from './FragmentMetricCollector';
export type { IFragmentMetricCollector } from './FragmentMetricCollector';

// Strategies
export * from './strategies';

// Fragments
export * from './fragments';
```

### New Index File: `src/runtime/compiler/fragments/index.ts`

```typescript
export { TimerFragment } from './TimerFragment';
export { EffortFragment } from './EffortFragment';
export { RoundsFragment } from './RoundsFragment';
export { RepFragment } from './RepFragment';
export { TextFragment } from './TextFragment';
export { DistanceFragment } from './DistanceFragment';
export { ResistanceFragment } from './ResistanceFragment';
export { IncrementFragment } from './IncrementFragment';
export { LapFragment } from './LapFragment';
export { ActionFragment } from './ActionFragment';
export type { ActionFragmentOptions } from './ActionFragment';
```

### New Index File: `src/runtime/compiler/strategies/index.ts`

```typescript
export { TimerStrategy } from './TimerStrategy';
export { EffortStrategy } from './EffortStrategy';
export { RoundsStrategy } from './RoundsStrategy';
export { GroupStrategy } from './GroupStrategy';
export { IntervalStrategy } from './IntervalStrategy';
export { TimeBoundRoundsStrategy } from './TimeBoundRoundsStrategy';
```

### Backward Compatibility

Create `src/fragments/index.ts` with deprecation warning:

```typescript
/**
 * @deprecated Import fragments from '@/runtime/compiler/fragments' instead
 */
console.warn('Importing from @/fragments is deprecated. Use @/runtime/compiler/fragments');

export * from '@/runtime/compiler/fragments';
```

### Search & Replace Patterns

```
# Fragment imports
@/fragments/TimerFragment    →  @/runtime/compiler/fragments
@/fragments/EffortFragment   →  @/runtime/compiler/fragments
@/fragments/RoundsFragment   →  @/runtime/compiler/fragments
@/fragments/RepFragment      →  @/runtime/compiler/fragments
@/fragments/TextFragment     →  @/runtime/compiler/fragments
@/fragments/                 →  @/runtime/compiler/fragments

# Strategy imports
@/runtime/strategies/        →  @/runtime/compiler/strategies

# Compiler imports
@/runtime/JitCompiler        →  @/runtime/compiler
@/runtime/RuntimeFactory     →  @/runtime/compiler
@/runtime/RuntimeBuilder     →  @/runtime/compiler
@/runtime/FragmentCompilationManager  →  @/runtime/compiler
@/runtime/FragmentCompilers  →  @/runtime/compiler
@/runtime/FragmentMetricCollector     →  @/runtime/compiler
```

---

## Phase 4: Reorganize Actions

### Mapping Table

| Current Path | New Path | Category |
|-------------|----------|----------|
| `src/runtime/NextAction.ts` | `src/runtime/actions/stack/NextAction.ts` | Stack |
| `src/runtime/PopBlockAction.ts` | `src/runtime/actions/stack/PopBlockAction.ts` | Stack |
| `src/runtime/PushBlockAction.ts` | `src/runtime/actions/stack/PushBlockAction.ts` | Stack |
| `src/runtime/actions/StackActions.ts` | `src/runtime/actions/stack/StackActions.ts` | Stack |
| `src/runtime/actions/ActionStackActions.ts` | `src/runtime/actions/stack/ActionStackActions.ts` | Stack |
| `src/runtime/actions/TimerDisplayActions.ts` | `src/runtime/actions/display/TimerDisplayActions.ts` | Display |
| `src/runtime/actions/CardDisplayActions.ts` | `src/runtime/actions/display/CardDisplayActions.ts` | Display |
| `src/runtime/actions/WorkoutStateActions.ts` | `src/runtime/actions/display/WorkoutStateActions.ts` | Display |
| `src/runtime/actions/SegmentActions.ts` | `src/runtime/actions/display/SegmentActions.ts` | Display |
| `src/runtime/actions/EmitEventAction.ts` | `src/runtime/actions/events/EmitEventAction.ts` | Events |
| `src/runtime/actions/EmitMetricAction.ts` | `src/runtime/actions/events/EmitMetricAction.ts` | Events |
| `src/runtime/actions/RegisterEventHandlerAction.ts` | `src/runtime/actions/events/RegisterEventHandlerAction.ts` | Events |
| `src/runtime/actions/UnregisterEventHandlerAction.ts` | `src/runtime/actions/events/UnregisterEventHandlerAction.ts` | Events |
| `src/runtime/actions/PlaySoundAction.ts` | `src/runtime/actions/audio/PlaySoundAction.ts` | Audio |
| `src/runtime/actions/ErrorAction.ts` | `src/runtime/actions/ErrorAction.ts` | Root |
| `src/runtime/actions/ThrowError.ts` | `src/runtime/actions/ThrowError.ts` | Root |

### New Index Files

#### `src/runtime/actions/index.ts`

```typescript
// Stack actions
export * from './stack';

// Display actions  
export * from './display';

// Event actions
export * from './events';

// Audio actions
export * from './audio';

// Error actions
export { ErrorAction } from './ErrorAction';
export { ThrowErrorAction } from './ThrowError';
```

#### `src/runtime/actions/stack/index.ts`

```typescript
export { NextAction } from './NextAction';
export { PopBlockAction } from './PopBlockAction';
export { PushBlockAction } from './PushBlockAction';
export { PushStackItemAction, PopStackItemAction } from './StackActions';
export { PushActionsAction, PopActionsAction, UpdateActionsAction } from './ActionStackActions';
export type { ActionDescriptor, ActionStackState } from './ActionStackActions';
```

#### `src/runtime/actions/display/index.ts`

```typescript
export { PushTimerDisplayAction, PopTimerDisplayAction, UpdateTimerDisplayAction } from './TimerDisplayActions';
export { SetWorkoutStateAction, SetRoundsDisplayAction, ResetDisplayStackAction } from './WorkoutStateActions';
export { StartSegmentAction, EndSegmentAction, EndAllSegmentsAction, RecordMetricAction, RecordRoundAction } from './SegmentActions';
export type { SegmentType } from './SegmentActions';
// CardDisplayActions exports
```

#### `src/runtime/actions/events/index.ts`

```typescript
export { EmitEventAction } from './EmitEventAction';
export { EmitMetricAction } from './EmitMetricAction';
export { RegisterEventHandlerAction } from './RegisterEventHandlerAction';
export { UnregisterEventHandlerAction } from './UnregisterEventHandlerAction';
```

#### `src/runtime/actions/audio/index.ts`

```typescript
export { PlaySoundAction } from './PlaySoundAction';
```

### Search & Replace Patterns

```
# Actions that move from root to stack/
@/runtime/NextAction         →  @/runtime/actions/stack
@/runtime/PopBlockAction     →  @/runtime/actions/stack
@/runtime/PushBlockAction    →  @/runtime/actions/stack

# Existing actions/ reorganization
@/runtime/actions/StackActions         →  @/runtime/actions/stack
@/runtime/actions/ActionStackActions   →  @/runtime/actions/stack
@/runtime/actions/TimerDisplayActions  →  @/runtime/actions/display
@/runtime/actions/CardDisplayActions   →  @/runtime/actions/display
@/runtime/actions/WorkoutStateActions  →  @/runtime/actions/display
@/runtime/actions/SegmentActions       →  @/runtime/actions/display
@/runtime/actions/EmitEventAction      →  @/runtime/actions/events
@/runtime/actions/EmitMetricAction     →  @/runtime/actions/events
@/runtime/actions/RegisterEventHandlerAction    →  @/runtime/actions/events
@/runtime/actions/UnregisterEventHandlerAction  →  @/runtime/actions/events
@/runtime/actions/PlaySoundAction      →  @/runtime/actions/audio
```

---

## Phase 5: Extract Testing Infrastructure

### Mapping Table

| Current Path | New Path | Action |
|-------------|----------|--------|
| `src/runtime/testing/TestableRuntime.ts` | `src/testing/testable/TestableRuntime.ts` | ✅ Move |
| `src/runtime/testing/TestableBlock.ts` | `src/testing/testable/TestableBlock.ts` | ✅ Move |
| `src/runtime/testing/actions/ITestSetupAction.ts` | `src/testing/setup/ITestSetupAction.ts` | ✅ Move |
| `src/runtime/testing/actions/AllocateTestMemoryAction.ts` | `src/testing/setup/AllocateTestMemoryAction.ts` | ✅ Move |
| `src/runtime/testing/actions/SetEffortStateAction.ts` | `src/testing/setup/SetEffortStateAction.ts` | ✅ Move |
| `src/runtime/testing/actions/SetLoopIndexAction.ts` | `src/testing/setup/SetLoopIndexAction.ts` | ✅ Move |
| `src/runtime/testing/actions/SetMemoryValueAction.ts` | `src/testing/setup/SetMemoryValueAction.ts` | ✅ Move |
| `src/runtime/testing/actions/SetTimerStateAction.ts` | `src/testing/setup/SetTimerStateAction.ts` | ✅ Move |
| `src/runtime/testing/actions/TestSetupActionRegistry.ts` | `src/testing/setup/TestSetupActionRegistry.ts` | ✅ Move |
| `src/runtime/testing/components/*` | `src/testing/components/*` | ✅ Move all |
| `tests/harness/BehaviorTestHarness.ts` | `src/testing/harness/BehaviorTestHarness.ts` | ✅ Move |
| `tests/harness/MockBlock.ts` | `src/testing/harness/MockBlock.ts` | ✅ Move |
| `tests/harness/RuntimeTestBuilder.ts` | `src/testing/harness/RuntimeTestBuilder.ts` | ✅ Move |

### New Index Files

#### `src/testing/index.ts`

```typescript
// Test harnesses
export * from './harness';

// Testable wrappers
export * from './testable';

// Setup actions
export * from './setup';
```

#### `src/testing/harness/index.ts`

```typescript
export { BehaviorTestHarness } from './BehaviorTestHarness';
export { MockBlock } from './MockBlock';
export { RuntimeTestBuilder, RuntimeTestHarness } from './RuntimeTestBuilder';
export type { RuntimeSnapshot, MemoryEntry } from './RuntimeTestBuilder';
```

#### `src/testing/testable/index.ts`

```typescript
export { TestableRuntime } from './TestableRuntime';
export type { 
  RuntimeSnapshot, 
  SnapshotDiff, 
  InitialMemoryEntry, 
  InitialStackEntry, 
  TestableRuntimeConfig,
  ExecutionRecord 
} from './TestableRuntime';

export { TestableBlock } from './TestableBlock';
export type { 
  InterceptMode, 
  MethodCall, 
  MemoryOperation, 
  StackOperation, 
  TestableBlockConfig 
} from './TestableBlock';
```

#### `src/testing/setup/index.ts`

```typescript
export type { 
  ITestSetupAction, 
  TestSetupActionJSON, 
  TestSetupActionFactory, 
  TestSetupActionParamSchema 
} from './ITestSetupAction';

export { AllocateTestMemoryAction } from './AllocateTestMemoryAction';
export type { AllocateTestMemoryParams } from './AllocateTestMemoryAction';

export { SetEffortStateAction } from './SetEffortStateAction';
export type { SetEffortStateParams } from './SetEffortStateAction';

export { SetLoopIndexAction } from './SetLoopIndexAction';
export type { SetLoopIndexParams } from './SetLoopIndexAction';

export { SetMemoryValueAction } from './SetMemoryValueAction';
export type { SetMemoryValueParams } from './SetMemoryValueAction';

export { SetTimerStateAction } from './SetTimerStateAction';
export type { SetTimerStateParams } from './SetTimerStateAction';

export { TestSetupActionRegistry } from './TestSetupActionRegistry';
export type { TestSetupPreset } from './TestSetupActionRegistry';
```

### Update tests/harness/ to re-export

Create `tests/harness/index.ts`:

```typescript
/**
 * @deprecated Import from '@/testing/harness' instead
 */
export * from '../../src/testing/harness';
```

### Search & Replace Patterns

```
# Runtime testing → src/testing
@/runtime/testing/TestableRuntime      →  @/testing/testable
@/runtime/testing/TestableBlock        →  @/testing/testable
@/runtime/testing/actions/             →  @/testing/setup
@/runtime/testing/components/          →  @/testing/components

# tests/harness → src/testing/harness
from '../../tests/harness'             →  from '@/testing/harness'
from '../../../tests/harness'          →  from '@/testing/harness'
from '../../../../tests/harness'       →  from '@/testing/harness'
```

---

## Phase 6: Consolidate Events

### Mapping Table

| Current Path | New Path | Action |
|-------------|----------|--------|
| `src/runtime/EventBus.ts` | `src/runtime/events/EventBus.ts` | ✅ Move |
| `src/runtime/NextEvent.ts` | `src/runtime/events/NextEvent.ts` | ✅ Move |
| `src/runtime/NextEventHandler.ts` | `src/runtime/events/NextEventHandler.ts` | ✅ Move |
| `src/runtime/MemoryEvents.ts` | `src/runtime/events/MemoryEvents.ts` | ✅ Move |
| `src/runtime/StackEvents.ts` | `src/runtime/events/StackEvents.ts` | ✅ Move |

### New Index File: `src/runtime/events/index.ts`

```typescript
// Event bus
export { EventBus } from './EventBus';
export type { EventHandlerRegistration } from './EventBus';

// Events
export { NextEvent, TickEvent } from './NextEvent';
export { NextEventHandler } from './NextEventHandler';

// Memory events
export { MemoryAllocateEvent, MemorySetEvent, MemoryReleaseEvent } from './MemoryEvents';

// Stack events
export { StackPushEvent, StackPopEvent, StackClearEvent } from './StackEvents';
```

### Search & Replace Patterns

```
@/runtime/EventBus           →  @/runtime/events
@/runtime/NextEvent          →  @/runtime/events
@/runtime/NextEventHandler   →  @/runtime/events
@/runtime/MemoryEvents       →  @/runtime/events
@/runtime/StackEvents        →  @/runtime/events
```

---

## Phase 7: Update External Imports

### Files to Update by Location

#### `src/core/types/runtime.ts`

Update all re-exports to use new paths:

```typescript
// BEFORE
export type { IScriptRuntime } from '@/runtime/IScriptRuntime';
export type { IRuntimeBlock } from '@/runtime/IRuntimeBlock';

// AFTER
export type { IScriptRuntime, IRuntimeBlock } from '@/runtime/contracts';
export type { JitCompiler, RuntimeFactory, RuntimeBuilder } from '@/runtime/compiler';
```

#### Stories Updates (`stories/**/*.tsx`)

Common patterns to find and replace:

```
# In stories
from '@/fragments/TimerFragment'     →  from '@/runtime/compiler/fragments'
from '@/runtime/strategies/'         →  from '@/runtime/compiler/strategies'
from '@/runtime/JitCompiler'         →  from '@/runtime/compiler'
```

#### Test Updates (`tests/**/*.ts`, `src/**/__tests__/*.ts`)

```
# In tests
from '../../../../tests/harness'     →  from '@/testing/harness'
from '@/runtime/testing/'            →  from '@/testing'
```

### Automated Script

Create `scripts/migrate-imports.ts`:

```typescript
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const IMPORT_MAPPINGS: [RegExp, string][] = [
  // Phase 1: Interfaces
  [/@\/runtime\/IScriptRuntime/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeBlock/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeAction/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeBehavior/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeMemory/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeStack/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeClock/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeBlockStrategy/g, '@/runtime/contracts'],
  [/@\/runtime\/IRuntimeOptions/g, '@/runtime/contracts'],
  [/@\/runtime\/IBlockContext/g, '@/runtime/contracts'],
  [/@\/runtime\/IMemoryReference/g, '@/runtime/contracts'],
  [/@\/runtime\/IEvent/g, '@/runtime/contracts/events'],
  [/@\/runtime\/IEventBus/g, '@/runtime/contracts/events'],
  [/@\/runtime\/IEventHandler/g, '@/runtime/contracts/events'],
  
  // Phase 3: Fragments
  [/@\/fragments\//g, '@/runtime/compiler/fragments/'],
  [/@\/runtime\/strategies\//g, '@/runtime/compiler/strategies/'],
  [/@\/runtime\/JitCompiler/g, '@/runtime/compiler'],
  [/@\/runtime\/RuntimeFactory/g, '@/runtime/compiler'],
  [/@\/runtime\/RuntimeBuilder/g, '@/runtime/compiler'],
  
  // Phase 4: Actions
  [/@\/runtime\/NextAction/g, '@/runtime/actions/stack'],
  [/@\/runtime\/PopBlockAction/g, '@/runtime/actions/stack'],
  [/@\/runtime\/PushBlockAction/g, '@/runtime/actions/stack'],
  
  // Phase 5: Testing
  [/@\/runtime\/testing\/TestableRuntime/g, '@/testing/testable'],
  [/@\/runtime\/testing\/TestableBlock/g, '@/testing/testable'],
  [/@\/runtime\/testing\/actions\//g, '@/testing/setup/'],
  
  // Phase 6: Events
  [/@\/runtime\/EventBus/g, '@/runtime/events'],
  [/@\/runtime\/NextEvent/g, '@/runtime/events'],
  [/@\/runtime\/MemoryEvents/g, '@/runtime/events'],
  [/@\/runtime\/StackEvents/g, '@/runtime/events'],
];

function updateImports(filePath: string): void {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  for (const [pattern, replacement] of IMPORT_MAPPINGS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function walkDirectory(dir: string): void {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      walkDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      updateImports(filePath);
    }
  }
}

// Run migration
walkDirectory('./src');
walkDirectory('./tests');
walkDirectory('./stories');
```

---

## Phase 8: Cleanup & Deprecation

### Files to Delete

After all imports are updated and tests pass:

```
src/fragments/                    # Empty directory (files moved)
src/runtime/IScriptRuntime.ts     # Moved to contracts/
src/runtime/IRuntimeBlock.ts      # Moved to contracts/
src/runtime/IRuntimeAction.ts     # Moved to contracts/
... (all I*.ts files)
src/runtime/JitCompiler.ts        # Moved to compiler/
src/runtime/strategies/           # Moved to compiler/strategies/
src/runtime/testing/              # Moved to src/testing/
```

### Deprecation Notices

For backward compatibility, keep re-export files with console warnings:

```typescript
// src/runtime/IScriptRuntime.ts (deprecated)
/**
 * @deprecated Import from '@/runtime/contracts' instead
 * This file will be removed in the next major version.
 */
export * from './contracts/IScriptRuntime';

if (process.env.NODE_ENV === 'development') {
  console.warn(
    'Deprecated: Import IScriptRuntime from "@/runtime/contracts" instead of "@/runtime/IScriptRuntime"'
  );
}
```

---

## Validation Checklist

### Per-Phase Validation

After each phase, run:

```powershell
# Type check
bun x tsc --noEmit

# Unit tests
bun run test

# Component tests
bun run test:components

# Storybook build
bun run build-storybook
```

### Final Validation

```powershell
# Full test suite
bun run test:all

# E2E tests (if Playwright is available)
bun run test:e2e

# Check for any remaining old imports
grep -r "@/runtime/IScriptRuntime" src/ tests/ stories/
grep -r "@/fragments/" src/ tests/ stories/
grep -r "tests/harness" src/
```

---

## Rollback Strategy

Each phase creates index files that re-export from new locations. If issues occur:

1. **Revert file moves** using git
2. **Keep index files** - they still work with old paths
3. **Fix issues** before continuing

```powershell
# Rollback a phase
git checkout HEAD~1 -- src/runtime/

# Or restore specific files
git checkout HEAD~1 -- src/runtime/IScriptRuntime.ts
```

---

## Summary: Import Cheat Sheet

### Quick Reference for Developers

```typescript
// INTERFACES (contracts)
import type { 
  IScriptRuntime, 
  IRuntimeBlock, 
  IRuntimeAction,
  IRuntimeBehavior,
  IRuntimeMemory,
  IRuntimeStack,
} from '@/runtime/contracts';

import type { IEvent, IEventBus, IEventHandler } from '@/runtime/contracts/events';

// COMPILER
import { JitCompiler, RuntimeBuilder, RuntimeFactory } from '@/runtime/compiler';
import { TimerStrategy, EffortStrategy } from '@/runtime/compiler/strategies';
import { TimerFragment, EffortFragment } from '@/runtime/compiler/fragments';

// ACTIONS
import { NextAction, PopBlockAction, PushBlockAction } from '@/runtime/actions/stack';
import { PushTimerDisplayAction } from '@/runtime/actions/display';
import { EmitEventAction } from '@/runtime/actions/events';
import { PlaySoundAction } from '@/runtime/actions/audio';

// EVENTS
import { EventBus, NextEvent, MemoryAllocateEvent } from '@/runtime/events';

// MODELS
import { TimeSpan, RuntimeSpan, RuntimeMetric } from '@/runtime/models';

// TESTING
import { BehaviorTestHarness, MockBlock, RuntimeTestBuilder } from '@/testing/harness';
import { TestableRuntime, TestableBlock } from '@/testing/testable';
import { SetTimerStateAction, SetMemoryValueAction } from '@/testing/setup';

// CORE IMPLEMENTATIONS (unchanged)
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeBlock } from '@/runtime/RuntimeBlock';
```
