# TypeScript Interfaces and Implementations

This document provides a comprehensive overview of all interfaces defined in the Wod.Wiki TypeScript codebase and their implementing classes, organized by functional area.

## Core Interfaces

### IRuntimeBlock
**Location**: `src/core/IRuntimeBlock.ts`
**Purpose**: Defines the contract for executable workout segments in the runtime system

**Implementing Classes**:
- `RuntimeBlock` (abstract base class) - `src/core/runtime/blocks/RuntimeBlock.ts`
  - `EffortBlock` - `src/core/runtime/blocks/EffortBlock.ts`
  - `TimerBlock` - `src/core/runtime/blocks/TimerBlock.ts`
  - `TimedGroupBlock` - `src/core/runtime/blocks/TimedGroupBlock.ts`
  - `RepeatingBlock` - `src/core/runtime/blocks/RepeatingBlock.ts`
  - `RootBlock` - `src/core/runtime/blocks/RootBlock.ts`
  - `IdleRuntimeBlock` - `src/core/runtime/blocks/IdleRuntimeBlock.ts`
  - `DoneRuntimeBlock` - `src/core/runtime/blocks/DoneRuntimeBlock.ts`

### IRuntimeAction
**Location**: `src/core/IRuntimeAction.ts`
**Purpose**: Defines operations that modify runtime state or trigger side effects

**Implementing Classes**:

#### Direct Implementations:
- `PopBlockAction` - `src/core/runtime/actions/PopBlockAction.ts`
- `PushStatementAction` - `src/core/runtime/actions/PushStatementAction.ts`
- `PushStatementWithTimerAction` - `src/core/runtime/actions/PushStatementWithTimerAction.ts`
- `PushEndBlockAction` - `src/core/runtime/actions/PushEndBlockAction.ts`
- `PushIdleBlockAction` - `src/core/runtime/actions/PushIdleBlockAction.ts`
- `ResetAction` - `src/core/runtime/actions/ResetAction.ts`
- `NotifyRuntimeAction` - `src/core/runtime/actions/NotifyRuntimeAction.ts`
- `PlaySoundAction` - `src/core/runtime/actions/PlaySoundAction.ts`
- `IdleStatementAction` - `src/core/runtime/actions/IdleStatementAction.ts`
- `StartTimerAction` - `src/core/runtime/actions/StartTimerAction.ts`
- `StopTimerAction` - `src/core/runtime/actions/StopTimerAction.ts`
- `UpdateMetricsAction` - `src/core/runtime/actions/UpdateMetricsAction.ts`
- `PopulateMetricsAction` - `src/core/runtime/actions/PopulateMetricsAction.ts`
- `PushNextAction` - `src/core/runtime/actions/PushNextAction.ts`

#### Abstract Base Classes:
- `AbstractRuntimeAction` (abstract) - `src/core/runtime/actions/base/AbstractRuntimeAction.ts`
    - `GotoEndAction` - `src/core/runtime/actions/GotoEndAction.ts`
  - `LeafNodeAction` (abstract) - `src/core/runtime/actions/base/LeafNodeAction.ts`
- `OutputAction` (abstract) - `src/core/runtime/OutputAction.ts`
  - `SetDurationAction` - `src/core/runtime/outputs/SetDurationAction.ts`
  - `SetSpanAction` - `src/core/runtime/outputs/SetSpanAction.ts`
  - `SetButtonAction` - `src/core/runtime/outputs/SetButtonAction.ts`
  - `SetTimerStateAction` - `src/core/runtime/outputs/SetTimerStateAction.ts`
  - `WriteLogAction` - `src/core/runtime/outputs/WriteLogAction.ts`
  - `WriteResultAction` - `src/core/runtime/outputs/WriteResultAction.ts`

### IRuntimeEvent
**Location**: `src/core/IRuntimeEvent.ts`
**Purpose**: Represents events in the runtime system (user interactions, timer events, etc.)

**Implementing Classes**:
- `CompleteEvent` - `src/core/runtime/inputs/CompleteEvent.ts`
- `SkipEvent` - `src/core/runtime/inputs/SkipEvent.ts`
- `TickEvent` - `src/core/runtime/inputs/TickHandler.ts`
- `StopEvent` - `src/core/runtime/inputs/StopEvent.ts`
- `StartEvent` - `src/core/runtime/inputs/StartEvent.ts`
- `SoundEvent` - `src/core/runtime/inputs/SoundEvent.ts`
- `SaveEvent` - `src/core/runtime/inputs/SaveEvent.ts`
- `RunEvent` - `src/core/runtime/inputs/RunEvent.ts`
- `ResetEvent` - `src/core/runtime/inputs/ResetEvent.ts`
- `PushActionEvent` - `src/core/runtime/inputs/PushActionEvent.ts`
- `NextStatementEvent` - `src/core/runtime/inputs/NextStatementEvent.ts`
- `EndEvent` - `src/core/runtime/inputs/EndEvent.ts`
- `DisplayEvent` - `src/core/runtime/inputs/DisplayEvent.ts`

### IRuntimeLog
**Location**: `src/core/IRuntimeLog.ts`
**Purpose**: Extends IRuntimeEvent with block identification for logging
**Extends**: `IRuntimeEvent`

**No direct implementing classes** - Used as a data structure interface

## Runtime System Interfaces

### ITimerRuntime
**Location**: `src/core/ITimerRuntime.ts`
**Purpose**: Core runtime interface for workout execution

**Implementing Classes**:
- None directly implement this interface

### ITimerRuntimeIo
**Location**: `src/core/ITimerRuntimeIo.ts`
**Purpose**: Extends ITimerRuntime with RxJS observables for I/O operations
**Extends**: `ITimerRuntime`

**Implementing Classes**:
- `TimerRuntime` - `src/core/runtime/TimerRuntime.ts`

## Strategy Pattern Interfaces

### IRuntimeBlockStrategy
**Location**: `src/core/runtime/blocks/strategies/IRuntimeBlockStrategy.ts`
**Purpose**: Strategy pattern for compiling JitStatements into RuntimeBlocks

**Implementing Classes**:
- `BlockEffortStrategy` - `src/core/runtime/blocks/strategies/BlockEffortStrategy.ts`
- `BlockTimerStrategy` - `src/core/runtime/blocks/strategies/BlockTimerStrategy.ts`
- `BlockCompoundStrategy` - `src/core/runtime/blocks/strategies/BlockCompoundStrategy.ts`
- `BlockRootStrategy` - `src/core/runtime/blocks/strategies/BlockRootStrategy.ts`
- `GroupRepeatingStrategy` - `src/core/runtime/blocks/strategies/GroupRepeatingStrategy.ts`
- `GroupCountdownStrategy` - `src/core/runtime/blocks/strategies/GroupCountdownStrategy.ts`

### IFragmentCompilationStrategy<TFragment>
**Location**: `src/core/runtime/strategies/IFragmentCompilationStrategy.ts`
**Purpose**: Generic strategy for compiling code fragments into runtime metrics

**Implementing Classes**:
- `RepMetricStrategy` - `src/core/runtime/strategies/RepMetricStrategy.ts`
- `EffortMetricStrategy` - `src/core/runtime/strategies/EffortMetricStrategy.ts`
- `DistanceMetricStrategy` - `src/core/runtime/strategies/DistanceMetricStrategy.ts`
- `RoundsMetricStrategy` - `src/core/runtime/strategies/RoundsMetricStrategy.ts`
- `ResistanceMetricStrategy` - `src/core/runtime/strategies/ResistanceMetricStrategy.ts`

## Data Structure Interfaces

### CodeFragment
**Location**: `src/core/CodeFragment.ts`
**Purpose**: Base interface for parsed code elements

**Implementing Classes**:
- `TimerFragment` - `src/core/fragments/TimerFragment.ts`
- `RepFragment` - `src/core/fragments/RepFragment.ts`
- `EffortFragment` - `src/core/fragments/EffortFragment.ts`
- `DistanceFragment` - `src/core/fragments/DistanceFragment.ts`
- `RoundsFragment` - `src/core/fragments/RoundsFragment.ts`
- `ActionFragment` - `src/core/fragments/ActionFragment.ts`
- `IncrementFragment` - `src/core/fragments/IncrementFragment.ts`
- `LapFragment` - `src/core/fragments/LapFragment.ts`
- `TextFragment` - `src/core/fragments/TextFragment.ts`
- `ResistanceFragment` - `src/core/fragments/ResistanceFragment.ts`

### ICodeStatement
**Location**: `src/core/CodeStatement.ts`
**Purpose**: Represents a parsed workout statement

**Implementing Classes**:
- `CodeStatement` (abstract) - `src/core/CodeStatement.ts`
- `JitStatement` - `src/core/JitStatement.ts`
- `IdleStatementNode` - `src/core/IdleStatementNode.ts`
- `RootStatementNode` - `src/core/RootStatementNode.ts`

### RuntimeMetric
**Location**: `src/core/RuntimeMetric.ts`
**Purpose**: Data structure for workout performance metrics

**No implementing classes** - Used as a data structure interface

### OutputEvent
**Location**: `src/core/OutputEvent.ts`
**Purpose**: Events emitted by the runtime to update UI

**No implementing classes** - Used as a data structure interface

## Duration and Time Interfaces

### IDuration
**Location**: `src/core/IDuration.ts`
**Purpose**: Represents time durations

**Implementing Classes**:
- `Duration` - `src/core/Duration.ts`
- `SpanDuration` - `src/core/Duration.ts`
- `TimeSpanDuration` - `src/core/TimeSpanDuration.ts`

### ISpanDuration
**Location**: `src/core/ISpanDuration.ts`
**Purpose**: Extends IDuration with elapsed time tracking
**Extends**: `IDuration`

**Implementing Classes**:
- `TimeSpanDuration` - `src/core/TimeSpanDuration.ts`

### ITimeSpan
**Location**: `src/core/ITimeSpan.ts`
**Purpose**: Represents a time interval with start and stop points

**No implementing classes** - Used as a data structure interface

## Metrics and Aggregation Interfaces

### IMetricsProvider
**Location**: `src/core/metrics/IMetricsProvider.ts`
**Purpose**: Interface for components that can provide metrics

**No implementing classes found** - Likely used by UI components

### IResultSpanAggregate
**Location**: `src/core/metrics/IResultSpanAggregate.ts`
**Purpose**: Interface for classes that aggregate statistics from ResultSpan objects

**Implementing Classes**:
- `ResultSpanAggregateBase` (abstract) - `src/core/metrics/ResultSpanAggregateBase.ts`

### IMetricCompositionStrategy
**Location**: `src/core/metrics/IMetricCompositionStrategy.ts`
**Purpose**: Strategy for metric composition

**No implementing classes found** - May be part of future metric composition features

## Event Handler Pattern

### EventHandler (Abstract Base Class)
**Location**: `src/core/runtime/EventHandler.ts`
**Purpose**: Base class for processing runtime events

**Extending Classes**:
- `CompleteHandler` - `src/core/runtime/inputs/CompleteEvent.ts`
- `SkipHandler` - `src/core/runtime/inputs/SkipEvent.ts`
- `TickHandler` - `src/core/runtime/inputs/TickHandler.ts`
- `StopHandler` - `src/core/runtime/inputs/StopEvent.ts`
- `StartHandler` - `src/core/runtime/inputs/StartEvent.ts`
- `SoundHandler` - `src/core/runtime/inputs/SoundEvent.ts`
- `SaveHandler` - `src/core/runtime/inputs/SaveEvent.ts`
- `RunHandler` - `src/core/runtime/inputs/RunEvent.ts`
- `ResetHandler` - `src/core/runtime/inputs/ResetEvent.ts`
- `PushActionHandler` - `src/core/runtime/inputs/PushActionEvent.ts`
- `NextStatementHandler` - `src/core/runtime/inputs/NextStatementEvent.ts`
- `EndHandler` - `src/core/runtime/inputs/EndEvent.ts`
- `DisplayHandler` - `src/core/runtime/inputs/DisplayHandler.ts`
- `RestRemainderHandler` - `src/core/runtime/inputs/RestRemainderHandler.ts`

## Editor and UI Interfaces

### WodWikiTokenHint
**Location**: `src/core/WodWikiTokenHint.ts`
**Purpose**: Interface for Monaco Editor token hints

**No implementing classes** - Used as a data structure for editor integration

### WodWikiToken
**Location**: `src/core/WodWikiToken.ts`
**Purpose**: Interface for syntax highlighting tokens

**No implementing classes** - Used as a data structure for editor integration

### WodWikiInitializer
**Location**: `src/core/WodWikiInitializer.ts`
**Purpose**: Interface for editor initialization

**No implementing classes** - Used as a data structure for editor configuration

### WodWikiProps
**Location**: `src/core/wodwiki.ts`
**Purpose**: Props interface for the main WodWiki component

**No implementing classes** - Used as React component props interface

### IActionButton
**Location**: `src/core/IActionButton.ts`
**Purpose**: Interface for UI action buttons

**No implementing classes** - Used as a data structure for button configurations

### SyntaxSuggestion
**Location**: `src/components/editor/SuggestionService.ts`
**Purpose**: Interface for Monaco Editor syntax suggestions

**No implementing classes** - Used as a data structure for editor suggestions

### UseTimerRuntimeProps
**Location**: `src/components/useTimerRuntime.ts`
**Purpose**: Props interface for the useTimerRuntime React hook

**No implementing classes** - Used as React hook props interface

### WorkoutEntry
**Location**: `src/components/workbook/WorkbookStorage.ts`
**Purpose**: Interface for stored workout entries in the workbook

**No implementing classes** - Used as a data structure for workout storage

## Context Interfaces

### FragmentCompilationContext
**Location**: `src/core/runtime/strategies/IFragmentCompilationStrategy.ts`
**Purpose**: Context for fragment compilation process

**No implementing classes** - Used as a data structure interface

### RuntimeState
**Location**: `src/core/runtime/strategies/IFragmentCompilationStrategy.ts`
**Purpose**: Current runtime state information

**No implementing classes** - Used as a data structure interface

### BlockContext
**Location**: `src/core/runtime/strategies/IFragmentCompilationStrategy.ts`
**Purpose**: Context information for block operations

**No implementing classes** - Used as a data structure interface

## Metadata and Helper Interfaces

### CodeMetadata
**Location**: `src/core/CodeMetadata.ts`
**Purpose**: Metadata about code location and parsing information

**Implementing Classes**:
- `ZeroIndexMeta` - `src/core/ZeroIndexMeta.ts`

### IRuntimeSync
**Location**: `src/core/IRuntimeSync.ts`
**Purpose**: Type alias for runtime synchronization functions

**No implementing classes** - Used as a function type definition

## Architecture Notes

### Design Patterns Used

1. **Strategy Pattern**: Used extensively for runtime block compilation (`IRuntimeBlockStrategy`) and fragment compilation (`IFragmentCompilationStrategy`)

2. **Template Method Pattern**: `RuntimeBlock` provides abstract lifecycle methods that concrete implementations override

3. **Observer Pattern**: RxJS observables used in `ITimerRuntimeIo` for event-driven architecture

4. **Factory Pattern**: `RuntimeJit` acts as a factory for creating appropriate `IRuntimeBlock` implementations

5. **Command Pattern**: `IRuntimeAction` implementations encapsulate operations that can be executed on the runtime

### Key Architectural Principles

- **Separation of Concerns**: Clear separation between parsing (fragments), compilation (strategies), and execution (blocks)
- **Event-Driven**: Runtime uses events and actions for state management
- **Extensibility**: Strategy patterns allow easy addition of new workout types and metrics
- **Type Safety**: Comprehensive TypeScript interfaces ensure compile-time safety
- **Reactive Programming**: RxJS integration for handling asynchronous events and state changes

This interface hierarchy supports the wod.wiki system's goal of being a flexible, extensible workout definition and execution platform while maintaining strong type safety and clear architectural boundaries.

## Chromecast Interfaces

### ChromecastReceiverEvent
**Location**: `src/cast/types/chromecast-events.ts`
**Purpose**: Interface for Chromecast receiver events

**No implementing classes** - Used as a data structure for cast communication

### ChromecastState
**Location**: `src/cast/hooks/useLocalCast.ts`, `src/cast/hooks/useCastSender.ts`
**Purpose**: Interface representing the state of Chromecast connections

**No implementing classes** - Used as a data structure for cast state management

### UseCastSenderResult
**Location**: `src/cast/hooks/useCastSender.ts`
**Purpose**: Return type interface for the useCastSender React hook

**No implementing classes** - Used as React hook return type interface

### UseCastReceiverResult
**Location**: `src/cast/hooks/useCastReceiver.ts`
**Purpose**: Return type interface for the useCastReceiver React hook

**No implementing classes** - Used as React hook return type interface
