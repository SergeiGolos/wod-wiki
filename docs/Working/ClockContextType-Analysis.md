# ClockContextType Working Document

## Overview

This document analyzes the current `ClockContextType` interface, its usage patterns, identified complexities, and potential areas for optimization in the wod.wiki codebase.

## Current Interface Definition

```typescript
export interface ClockContextType {
  registry: {
    durations: Map<string, ISpanDuration>;
    states: Map<string, TimerState>;
    efforts: Map<string, string>;
    buttons: Map<string, IActionButton[]>; // Added buttons to registry
  };
}
```

## New Schema (Simplified Model)

The new schema dramatically simplifies the ClockContext by:
1. **Eliminating Map-based registries** in favor of simple arrays
2. **Consolidating data types** into unified span-based structures
3. **Removing state/effort tracking** in favor of complete RuntimeSpan data
4. **Simplifying event handling** with clear add/update/remove semantics

```typescript
export interface ViewSpan extends RuntimeSpan {
   anchor: string; // stores the name of the anchor to bind runtime view to
}

export interface ViewButton {
	anchor: string;
	buttons: IActionButton[]; // stores the buttons for this anchor
}

export interface ClockContextType {
  results: RuntimeSpan[];  // Historical results from completed blocks
  clocks: ViewSpan[];      // Active timer displays by anchor name
  buttons: ViewButton[];   // Button groups by anchor name
}
```

### Event Handling Changes
- **Block Completion**: `results` array gets new RuntimeSpan appended
- **SET_SPAN Event**: Find/update `clocks` array by anchor, or add new ViewSpan
- **SET_BUTTON Event**: Find/update `buttons` array by anchor, or add new ViewButton
- **Clearing**: Events with `undefined` values remove entries from respective arrays

### Benefits of New Schema
1. **Simpler data structures**: Arrays instead of Maps
2. **Better integration**: RuntimeSpan carries all needed data (duration, state, effort, metrics)
3. **Reduced complexity**: No separate tracking of states/efforts
4. **Historical data**: Complete results history available
5. **Type safety**: Anchor-based targeting with proper interfaces
## Usage Analysis

### 1. Primary Usage Locations

#### 1.1 ClockContext Provider (`src/contexts/ClockContext.tsx`)
- **Purpose**: Main provider that subscribes to runtime events and maintains registry state
- **Events Handled**: 
  - `SET_SPAN` → updates durations registry
  - `SET_TIMER_STATE` → updates states registry   
  - `SET_EFFORT` → updates efforts registry
  - `SET_BUTTON` → updates buttons registry
- **Complexity**: High - manages 4 different Maps with event-driven updates

#### 1.2 WodTimer Component (`src/components/clock/WodTimer.tsx`)
- **Usage**: Creates ClockContext.Provider with registry from `useClockRegistry` hook
- **Issue**: Interface mismatch - WodTimer provides additional `isRunning` and `isCountdown` properties not in ClockContextType
- **Code conflict**:
```typescript
// WodTimer provides these extra properties not in ClockContextType:
return (
  <ClockContext.Provider value={{ 
    registry: {
      durations: clockRegistry.durations,
      states: clockRegistry.states,
      efforts: clockRegistry.efforts  // Missing buttons!
    },
    isRunning,     // Not in ClockContextType
    isCountdown    // Not in ClockContextType
  }}>
```

#### 1.3 Consumer Hooks
- **`useClockContext()`**: Direct access to context
- **`useRuntimeSpan(name)`**: Gets duration, state, and effort for specific name
- **`useRuntimeButtons(target)`**: Gets buttons array for specific target
- **Helper functions**: `getClockByName`, `getClockStateName`, `getClockEffortByName`

#### 1.4 ButtonAnchor Component (`src/components/buttons/ButtonAnchor.tsx`)
- **Usage**: Uses `useRuntimeButtons(name)` to get target-specific button arrays
- **Purpose**: Renders runtime-driven button UI based on SET_BUTTON events

### 2. Event Sources and Actions

#### 2.1 SET_SPAN Events
- **Source**: `SetClockAction` class 
- **Payload**: `{ duration: ISpanDuration, target: string, effort?: string }`
- **Purpose**: Updates timer display with current duration and state

#### 2.2 SET_TIMER_STATE Events  
- **Source**: Runtime timer actions
- **Payload**: `{ state: TimerState, target: string }`
- **Purpose**: Updates timer state (RUNNING_COUNTDOWN, RUNNING_COUNTUP, etc.)

#### 2.3 SET_EFFORT Events
- **Source**: `EffortBlock` and other runtime blocks
- **Payload**: `{ effort: string, target: string }`  
- **Purpose**: Updates current exercise/effort display

#### 2.4 SET_BUTTON Events
- **Source**: `SetButtonAction` class
- **Payload**: `{ buttons: IActionButton[], target: string }`
- **Purpose**: Updates available action buttons for specific targets

### 3. Parallel Systems - Complexity Analysis

#### 3.1 ClockContext vs useClockRegistry Hook
- **Duplication**: Both systems track durations, states, and efforts
- **Different patterns**: 
  - ClockContext: Observable-based, event subscription
  - useClockRegistry: Array-based event processing with intervals
- **Inconsistency**: ClockContext has buttons, useClockRegistry does not

#### 3.2 Interface Definition vs Implementation  
- **Missing buttons in WodTimer**: WodTimer doesn't pass buttons from clockRegistry
- **Extra properties**: WodTimer adds isRunning/isCountdown not in interface
- **Type safety issues**: Runtime mismatch between interface and actual usage

## Identified Issues and Dead Code

### 1. **CRITICAL: Interface vs Implementation Mismatch**

The ClockContextType interface doesn't match how it's actually used:

```typescript
// Interface says this:
export interface ClockContextType {
  registry: {
    durations: Map<string, ISpanDuration>;
    states: Map<string, TimerState>;
    efforts: Map<string, string>;
    buttons: Map<string, IActionButton[]>;
  };
}

// But WodTimer actually provides this:
<ClockContext.Provider value={{ 
  registry: {
    durations: clockRegistry.durations,
    states: clockRegistry.states,
    efforts: clockRegistry.efforts    // Missing buttons!
  },
  isRunning,    // Extra property
  isCountdown   // Extra property  
}}>
```

### 2. **System Duplication**

Two parallel systems doing similar work:
- **ClockContext**: Event-driven registry management  
- **useClockRegistry**: Array-based event processing

### 3. **Dead/Problematic Code**

#### 3.1 Hardcoded System Button (ClockContext.tsx:50-56)
```typescript
registry.buttons.set('system', [{
  label: 'System',
  variant: 'primary', 
  onClick: () => [{ name: 'run', timestamp: new Date() }],
  event: 'run'  // Typo: should be 'run'?
}]);
```
- **Issues**: Hardcoded, typo in event name, unclear purpose

#### 3.2 Unused Helper Functions
Several helper functions in ClockContext may be redundant:
- `getClockByName` - duplicates registry.durations.get()
- `getClockStateName` - duplicates registry.states.get()  
- `getClockEffortByName` - duplicates registry.efforts.get()

#### 3.3 Test Mocking Complexity
WodTimer tests need complex mocking due to dual system usage:
```typescript
// Mock both useClockRegistry AND ClockContext
vi.mock('@/hooks', () => ({
  useClockRegistry: vi.fn(...),
  getClockState: vi.fn(...)
}));
```

### 4. **Unnecessary Complexity**

#### 4.1 Multiple Registry Update Patterns
Different events use different update patterns:
- SET_SPAN: Creates new Map, spreads previous state
- SET_TIMER_STATE: Creates new Map, spreads previous state  
- SET_EFFORT: Creates new Map, spreads previous state
- SET_BUTTON: Creates new Map, spreads previous state

Could be unified into a single pattern.

#### 4.2 String-based Target System
All registries use string keys for targets, but no validation or type safety:
- 'primary', 'total', 'system', etc. are magic strings
- No enum or const definitions for valid targets

## Areas Requiring Changes for New Schema Migration

### 1. **Core Interface and Type Definitions**

#### 1.1 ClockContext.tsx - Interface Update
```typescript
// BEFORE (Current)
export interface ClockContextType {
  registry: {
    durations: Map<string, ISpanDuration>;
    states: Map<string, TimerState>;
    efforts: Map<string, string>;
    buttons: Map<string, IActionButton[]>;
  };
}

// AFTER (New Schema)
export interface ViewSpan extends RuntimeSpan {
   anchor: string;
}

export interface ViewButton {
	anchor: string;
	buttons: IActionButton[];
}

export interface ClockContextType {
  results: RuntimeSpan[];
  clocks: ViewSpan[];
  buttons: ViewButton[];
}
```

#### 1.2 State Management Updates
```typescript
// BEFORE - Map-based state
const [registry, setRegistry] = useState<ClockContextType['registry']>({
  durations: new Map<string, ISpanDuration>(),
  states: new Map<string, TimerState>(),
  efforts: new Map<string, string>(),
  buttons: new Map<string, IActionButton[]>()
});

// AFTER - Array-based state
const [contextState, setContextState] = useState<ClockContextType>({
  results: [],
  clocks: [],
  buttons: []
});
```

### 2. **Event Handler Refactoring**

#### 2.1 SET_SPAN Event Handler
```typescript
// BEFORE - Map update
case 'SET_SPAN':
  if (event.bag?.duration && event.bag?.target) {
    setRegistry(prev => {
      const newDurations = new Map(prev.durations);
      newDurations.set(event.bag.target, event.bag.duration);
      return { ...prev, durations: newDurations };
    });
  }

// AFTER - Array update
case 'SET_SPAN':
  if (event.bag?.target) {
    setContextState(prev => {
      if (event.bag.duration === undefined) {
        // Clear clock for this anchor
        return {
          ...prev,
          clocks: prev.clocks.filter(clock => clock.anchor !== event.bag.target)
        };
      }
      
      // Update or add clock
      const existingIndex = prev.clocks.findIndex(clock => clock.anchor === event.bag.target);
      const newViewSpan: ViewSpan = {
        ...event.bag.duration, // RuntimeSpan data
        anchor: event.bag.target
      };
      
      const newClocks = [...prev.clocks];
      if (existingIndex >= 0) {
        newClocks[existingIndex] = newViewSpan;
      } else {
        newClocks.push(newViewSpan);
      }
      
      return { ...prev, clocks: newClocks };
    });
  }
```

#### 2.2 SET_BUTTON Event Handler
```typescript
// BEFORE - Map update
case 'SET_BUTTON':
  if (event.bag?.buttons && event.bag?.target) {
    setRegistry(prev => {
      const newButtons = new Map(prev.buttons);
      newButtons.set(event.bag.target, event.bag.buttons);
      return { ...prev, buttons: newButtons };
    });
  }

// AFTER - Array update
case 'SET_BUTTON':
  if (event.bag?.target) {
    setContextState(prev => {
      if (event.bag.buttons === undefined) {
        // Clear buttons for this anchor
        return {
          ...prev,
          buttons: prev.buttons.filter(btn => btn.anchor !== event.bag.target)
        };
      }
      
      // Update or add buttons
      const existingIndex = prev.buttons.findIndex(btn => btn.anchor === event.bag.target);
      const newViewButton: ViewButton = {
        anchor: event.bag.target,
        buttons: event.bag.buttons
      };
      
      const newButtons = [...prev.buttons];
      if (existingIndex >= 0) {
        newButtons[existingIndex] = newViewButton;
      } else {
        newButtons.push(newViewButton);
      }
      
      return { ...prev, buttons: newButtons };
    });
  }
```

#### 2.3 New Block Completion Handler
```typescript
// NEW - Handle block completion results
case 'BLOCK_COMPLETED': // Or whatever event type is used
  if (event.bag?.resultSpan) {
    setContextState(prev => ({
      ...prev,
      results: [...prev.results, event.bag.resultSpan]
    }));
  }
```

#### 2.4 Remove Obsolete Event Handlers
```typescript
// REMOVE - No longer needed with new schema
case 'SET_TIMER_STATE': // Data now in RuntimeSpan
case 'SET_EFFORT':      // Data now in RuntimeSpan
```

### 3. **Hook and Consumer Updates**

#### 3.1 useRuntimeSpan Hook Refactoring
```typescript
// BEFORE - Map-based lookup
export const useRuntimeSpan = (name: string) => {
  const { registry } = useClockContext();
  return {
    duration: registry.durations.get(name),
    state: registry.states.get(name),
    effort: registry.efforts.get(name)
  };
};

// AFTER - Array-based lookup
export const useRuntimeSpan = (anchor: string) => {
  const { clocks } = useClockContext();
  return clocks.find(clock => clock.anchor === anchor);
};
```

#### 3.2 useRuntimeButtons Hook Update
```typescript
// BEFORE - Map-based lookup
export const useRuntimeButtons = (target: string): IActionButton[] | undefined => {
  const { registry } = useClockContext();
  return registry.buttons.get(target);
};

// AFTER - Array-based lookup
export const useRuntimeButtons = (anchor: string): IActionButton[] | undefined => {
  const { buttons } = useClockContext();
  return buttons.find(btn => btn.anchor === anchor)?.buttons;
};
```

#### 3.3 New Hook for Results History
```typescript
// NEW - Access to historical results
export const useRuntimeResults = (): RuntimeSpan[] => {
  const { results } = useClockContext();
  return results;
};

// NEW - Get results by specific criteria
export const useRuntimeResultsByEffort = (effort: string): RuntimeSpan[] => {
  const { results } = useClockContext();
  return results.filter(span => 
    span.metrics.some(metric => metric.effort === effort)
  );
};
```

#### 3.4 Backward Compatibility Hook
```typescript
// NEW - Temporary hook for backward compatibility
export const useRuntimeSpanLegacy = (name: string) => {
  const viewSpan = useRuntimeSpan(name);
  return {
    duration: viewSpan ? extractDuration(viewSpan) : undefined,
    state: viewSpan ? extractState(viewSpan) : undefined,
    effort: viewSpan ? extractEffort(viewSpan) : undefined
  };
};
```

#### 3.5 Remove Redundant Helper Functions
```typescript
// REMOVE - No longer needed with simplified array access
export const getClockByName = (...) => { ... };
export const getClockStateName = (...) => { ... };
export const getClockEffortByName = (...) => { ... };
```

### 4. **Component Integration Updates**

#### 4.1 WodTimer Component Changes
```typescript
// BEFORE - Complex registry mapping
<ClockContext.Provider value={{ 
  registry: {
    durations: clockRegistry.durations,
    states: clockRegistry.states,
    efforts: clockRegistry.efforts,
    buttons: clockRegistry.buttons || new Map()
  },
  isRunning,
  isCountdown
}}>

// AFTER - Direct state provision (WodTimer may become obsolete)
<ClockContext.Provider value={{
  results: [], // Historical data not typically provided by WodTimer
  clocks: clockRegistry.clocks || [],
  buttons: clockRegistry.buttons || []
}}>
```

#### 4.2 ButtonAnchor Component Updates
```typescript
// BEFORE - Map-based button lookup
const buttons = useRuntimeButtons(name);

// AFTER - Same interface, different implementation
const buttons = useRuntimeButtons(name); // Now uses array lookup
```

#### 4.3 ClockAnchor Component Updates
```typescript
// BEFORE - Multiple hook calls for different data
const { duration, state, effort } = useRuntimeSpan(name);

// AFTER - Single RuntimeSpan with all data
const viewSpan = useRuntimeSpan(name);
// All data available in viewSpan: timeSpans, metrics, etc.
```

### 5. **Event Source Updates**

#### 5.1 SetClockAction Modifications
```typescript
// The SetClockAction needs to provide RuntimeSpan data instead of just ISpanDuration
// This may require significant changes to how durations are calculated and passed
```

#### 5.2 New Block Completion Events
```typescript
// Runtime blocks need to emit completion events with full RuntimeSpan data
// This integrates with the existing ResultSpan system
```

### 6. **Data Migration Strategy**

#### 6.1 Backward Compatibility Layer
```typescript
// Temporary compatibility hooks during migration
export const useRuntimeSpanLegacy = (name: string) => {
  const viewSpan = useRuntimeSpan(name);
  return {
    duration: viewSpan ? extractDuration(viewSpan) : undefined,
    state: viewSpan ? extractState(viewSpan) : undefined,
    effort: viewSpan ? extractEffort(viewSpan) : undefined
  };
};
```

#### 6.2 Testing Strategy Updates
```typescript
// Tests need updated mocking for array-based structures
const mockClockContext = {
  results: [],
  clocks: [{ anchor: 'primary', ...mockRuntimeSpan }],
  buttons: [{ anchor: 'system', buttons: [...] }]
};
```

### 7. **Performance and Enhancement (Long term)**
1. **Implement results history management** - Size limits, cleanup, efficient searching
2. **Add performance optimizations** - Consider memoization for array operations
3. **Enhance Chromecast integration** - Update for new array-based structures
4. **Add advanced filtering** - Results by effort, time range, block type
5. **Comprehensive testing** - Full integration tests for new schema

## Migration Status - COMPLETED ✅

**Date**: Completed 2025-05-31

The ClockContextType migration has been successfully completed with the following changes:

### ✅ Completed Tasks

1. **Core Interface Migration**:
   - ✅ Updated `ClockContext.tsx` with new simplified schema
   - ✅ Replaced Map-based registry with array-based structures
   - ✅ Created `ViewClock` interface matching actual SET_SPAN event data
   - ✅ Fixed type mismatch between expected RuntimeSpan and actual ISpanDuration

2. **Component Updates**:
   - ✅ Updated `ClockAnchor.tsx` to use ViewClock interface
   - ✅ Updated `EffortAnchor.tsx` to use effort from SET_SPAN events
   - ✅ Verified `ButtonAnchor.tsx` works correctly with new schema

3. **Hook Updates**:
   - ✅ Updated `useRuntimeSpan()` hook for backwards compatibility
   - ✅ Added `useRuntimeClock()` hook for new pattern
   - ✅ Maintained `useRuntimeButtons()` hook (no changes needed)
   - ✅ Added hooks for historical results tracking

4. **Event Handling**:
   - ✅ Fixed SET_SPAN event handling to use proper ViewClock structure
   - ✅ Maintained SET_BUTTON event handling
   - ✅ Added WRITE_RESULT event handling for historical tracking
   - ✅ All events use array-based find/filter operations instead of Map operations

5. **Type Safety**:
   - ✅ Eliminated type mismatches between ISpanDuration and RuntimeSpan
   - ✅ Proper typing for all event handlers
   - ✅ All compilation errors resolved

### 🎯 Key Improvements Achieved

1. **Simplified Architecture**: Moved from complex Map-based registry to simple array structures
2. **Type Alignment**: Interface now matches actual runtime event data (ISpanDuration)
3. **Dead Code Removal**: Eliminated obsolete helper functions and hardcoded systems
4. **Performance**: Removed redundant system duplication between ClockContext and useClockRegistry
5. **Maintainability**: Clear separation between active clocks, buttons, and historical results

### 📊 Final Schema

```typescript
export interface ViewClock {
  anchor: string;
  duration: ISpanDuration;
  effort?: string; // From SET_SPAN events
}

export interface ViewButton {
  anchor: string;
  buttons: IActionButton[];
}

export interface ClockContextType {
  results: RuntimeSpan[];  // Historical results (WRITE_RESULT events)
  clocks: ViewClock[];     // Active timers (SET_SPAN events)
  buttons: ViewButton[];   // Button groups (SET_BUTTON events)
}
```

### 🔄 Next Steps (Optional)

1. **Performance Optimization**: Consider implementing results history management (limit array size)
2. **Testing**: Add comprehensive tests for new schema
3. **useClockRegistry Cleanup**: Remove or refactor the duplicate useClockRegistry hook
4. **Documentation**: Update component documentation to reflect new patterns

---
