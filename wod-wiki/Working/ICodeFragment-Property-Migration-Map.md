---
title: "ICodeFragment Property Migration Map"
date: 2025-06-18
tags: [migration, interface, code-fragment]
related: ["../Core/ICodeFragment.md"]
status: documentation
---

# ICodeFragment Property Migration Map

## Overview

This document maps the existing fragment implementations to the new `ICodeFragment` interface properties. The updated interface consolidates fragment-specific properties into standardized interface properties while maintaining backward compatibility during the migration period.

## Updated Interface Structure

```typescript
export interface ICodeFragment {
  readonly image?: string;
  readonly value?: any;
  readonly type: string; // Retained for now, will be replaced by fragmentType
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
  // Pure data interface - no metric methods
}
```

## Property Migration Mapping

### Core Interface Properties

| New Property | Purpose | Legacy Equivalent | Migration Notes |
|--------------|---------|-------------------|-----------------|
| `image` | Raw text representation | Fragment-specific `image` properties | Standardized from TimerFragment.image, IncrementFragment.image, LapFragment.image |
| `value` | Primary fragment value | Fragment-specific properties | Consolidates various fragment values into single property |
| `type` | Legacy type identifier | Fragment-specific `type` strings | Retained for backward compatibility |
| `meta` | Source location metadata | Fragment-specific `meta` properties | Already standardized across fragments |
| `fragmentType` | New enum-based type | Fragment-specific `type` strings | Replaces string-based type system |

## Fragment-Specific Migration Details

### TimerFragment
**Current Implementation:**
```typescript
class TimerFragment {
  image: string;           // "1:30:00" format
  days: number;           // Parsed component
  hours: number;          // Parsed component  
  minutes: number;        // Parsed component
  seconds: number;        // Parsed component
  original: number;       // Total milliseconds
  type: "duration";
  meta: CodeMetadata;
}
```

**Migration Mapping:**
- `image` → `image` (direct mapping)
- `original` → `value` (primary timing value in milliseconds)
- `type: "duration"` → `type` (retained) + `fragmentType: FragmentType.Timer`
- `meta` → `meta` (direct mapping)
- **Derived Properties**: `days`, `hours`, `minutes`, `seconds` will be computed from `value` when needed

### RepFragment
**Current Implementation:**
```typescript
class RepFragment {
  reps?: number;
  type: "rep";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `reps` → `value` (number of repetitions)
- `type: "rep"` → `type` (retained) + `fragmentType: FragmentType.Rep`
- `meta` → `meta` (direct mapping)
- `image` → `undefined` (not used in RepFragment)

### ActionFragment
**Current Implementation:**
```typescript
class ActionFragment {
  action: string;         // "push-ups", "squats", etc.
  type: "action";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `action` → `value` (action name)
- `action` → `image` (same as value for actions)
- `type: "action"` → `type` (retained) + `fragmentType: FragmentType.Action`
- `meta` → `meta` (direct mapping)

### DistanceFragment
**Current Implementation:**
```typescript
class DistanceFragment {
  value: string;          // Numeric value as string
  units: string;          // "m", "km", "mi", etc.
  type: "distance";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `{value, units}` → `value` (object containing both: `{amount: string, units: string}`)
- `value + " " + units` → `image` (combined representation: "100 m")
- `type: "distance"` → `type` (retained) + `fragmentType: FragmentType.Distance`
- `meta` → `meta` (direct mapping)

### TextFragment
**Current Implementation:**
```typescript
class TextFragment {
  text: string;           // Text content
  level?: string;         // Hierarchy level
  type: "text";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `text` → `value` (text content)
- `text` → `image` (same as value for text)
- `type: "text"` → `type` (retained) + `fragmentType: FragmentType.Text`
- `meta` → `meta` (direct mapping)
- **Note**: `level` information could be preserved in metadata or as part of value object

### ResistanceFragment
**Current Implementation:**
```typescript
class ResistanceFragment {
  value: string;          // Weight amount
  units: string;          // "lb", "kg", etc.
  type: "resistance";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `{value, units}` → `value` (object containing both: `{amount: string, units: string}`)
- `value + " " + units` → `image` (combined representation: "45 lb")
- `type: "resistance"` → `type` (retained) + `fragmentType: FragmentType.Resistance`
- `meta` → `meta` (direct mapping)

### EffortFragment
**Current Implementation:**
```typescript
class EffortFragment {
  effort: string;         // "easy", "moderate", "hard", etc.
  type: "effort";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `effort` → `value` (effort level)
- `effort` → `image` (same as value for effort)
- `type: "effort"` → `type` (retained) + `fragmentType: FragmentType.Effort`
- `meta` → `meta` (direct mapping)

### RoundsFragment
**Current Implementation:**
```typescript
class RoundsFragment {
  count: number;          // Number of rounds
  type: "rounds";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `count` → `value` (number of rounds)
- `count.toString()` → `image` (string representation of count)
- `type: "rounds"` → `type` (retained) + `fragmentType: FragmentType.Rounds`
- `meta` → `meta` (direct mapping)

### IncrementFragment
**Current Implementation:**
```typescript
class IncrementFragment {
  image: string;          // "^" or "v"
  increment: number;      // 1 or -1
  type: "increment";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `image` → `image` (direct mapping)
- `increment` → `value` (1 or -1)
- `type: "increment"` → `type` (retained) + `fragmentType: FragmentType.Increment`
- `meta` → `meta` (direct mapping)

### LapFragment
**Current Implementation:**
```typescript
class LapFragment {
  group: GroupType;       // Grouping information
  image: string;          // Raw text representation
  type: "lap";
  meta?: CodeMetadata;
}
```

**Migration Mapping:**
- `image` → `image` (direct mapping)
- `group` → `value` (GroupType information)
- `type: "lap"` → `type` (retained) + `fragmentType: FragmentType.Lap`
- `meta` → `meta` (direct mapping)

## Migration Strategy

### Phase 1: Interface Extension
1. ✅ Add new properties to `ICodeFragment` interface
2. ✅ Create `FragmentType` enum
3. ✅ Update fragment implementations to include both old and new properties

### Phase 2: Value Consolidation
1. Update fragment constructors to populate `value` property appropriately
2. Update fragment constructors to populate `image` property where applicable
3. Ensure `fragmentType` is correctly set for all fragments

### Phase 3: Consumer Migration
1. Update parsers to use new properties
2. Update runtime components to read from new properties
3. Update rendering components to use standardized properties

### Phase 4: Legacy Cleanup
1. Remove fragment-specific properties
2. Remove `type` string property
3. Update all consumers to use `fragmentType` enum

## Validation Checklist

### For Each Fragment Type:
- [ ] `fragmentType` enum value matches legacy `type` string
- [ ] Primary fragment data is accessible via `value` property
- [ ] Text representation is available via `image` property (where applicable)
- [ ] `meta` property preserves source location information
- [ ] Legacy properties remain functional during migration period

### For Complex Value Types:
- [ ] DistanceFragment: `value` contains `{amount, units}` object
- [ ] ResistanceFragment: `value` contains `{amount, units}` object
- [ ] TimerFragment: `value` contains milliseconds total
- [ ] LapFragment: `value` contains GroupType information

## Benefits of Migration

1. **Standardization**: All fragments expose data through consistent interface
2. **Type Safety**: Enum-based fragment typing replaces string matching
3. **Simplification**: Reduces fragment-specific property handling
4. **Extensibility**: New fragment types can be added with minimal interface changes
5. **Parsing Efficiency**: Consolidated value access patterns

## Implementation Notes

- During migration, both old and new properties should be maintained
- Consumers should be updated incrementally to use new properties
- Fragment constructors should populate both property sets until migration is complete
- Parser should be updated to work with consolidated value structure
- Runtime components should validate fragment types using enum rather than string comparison

## Related Documentation

- [Core ICodeFragment Interface](../Core/ICodeFragment.md)
- [Fragment Type System](./Fragment-Type-System.md)
- [Parser Migration Guide](./Parser-Migration-Guide.md)
