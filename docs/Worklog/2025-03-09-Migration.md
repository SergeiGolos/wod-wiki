# Migration Plan: Strategy to Handler Architecture

## Overview

This document outlines the steps for migrating from the current compiler strategy pattern to the new statement handler architecture. This refactoring improves separation of concerns, testability, and extensibility while preserving existing functionality.

## Completed Items

1. ✅ Created base interfaces:
   - `IStatementHandler` - Determines if a handler can process a node and creates runtime handlers
   - `IRuntimeHandler` - Processes timer events and produces runtime actions

2. ✅ Implemented first handler examples:
   - `AMRAPHandler` - Handles AMRAP workout structures
   - `RepeatingGroupHandler` - Handles repeating round structures

3. ✅ Created new runtime implementation:
   - `timer.runtime.new.ts` - Updated with handler-based architecture
   - `useTimerRuntime.new.ts` - Updated hook implementation

## Migration Steps

### Phase 1: Complete Handler Implementations

1. Implement remaining handlers (based on existing strategies):
   - `RepeatingStatementHandler` (from `RepeatingStatementStrategy`)
   - `StatementHandler` (from `StatementStrategy`)
   - `SingleUnitHandler` (from `SingleUnitStrategy`)

2. Ensure all handlers properly implement the `IStatementHandler` interface and create appropriate `IRuntimeHandler` implementations.

### Phase 2: Integration Testing

1. Create a test suite for the new handler-based architecture:
   - Unit tests for individual handlers
   - Integration tests for handler interaction with runtime
   - End-to-end test for common workout scenarios

2. Validate that all existing workout scenarios work properly with the new architecture.

### Phase 3: Runtime Transition

1. Rename the new implementation files:
   - Rename `timer.runtime.new.ts` to `timer.runtime.ts`
   - Rename `useTimerRuntime.new.ts` to `useTimerRuntime.ts`

2. Update import references throughout the codebase to use the new implementations.

3. Remove or archive the old compiler strategy implementations.

### Phase 4: Documentation Updates

1. Update architecture documentation to reflect the new handler-based approach:
   - Update `docs/Components/Runtime.md`
   - Create new diagrams showing the handler flow

2. Ensure all new components are properly documented with JSDoc comments.

## Risk Mitigation

1. **Rollback Plan**: Keep original strategy files until the new system is fully validated.

2. **Staged Deployment**: First deploy to staging environment and verify functionality before production.

3. **Feature Flags**: Consider implementing feature flags to toggle between old and new systems during transition.

## Handler Implementation Template

For each new handler, follow this implementation pattern:

```typescript
// MyFeatureHandler.ts
export class MyFeatureHandler implements IStatementHandler {
  canHandle(node: StatementNode): boolean {
    // Logic to determine if this handler can process the node
  }
  
  createHandler(node: StatementNode): IRuntimeHandler {
    return new MyFeatureRuntimeHandler(node);
  }
}

class MyFeatureRuntimeHandler implements IRuntimeHandler {
  type = "my_feature";
  
  constructor(private node: StatementNode) {
    // Initialize handler state
  }
  
  onTimerEvent(timestamp: Date, event: string, blocks?: RuntimeBlock[]): IRuntimeAction[] {
    // Process timer events and return actions
  }
}
```
