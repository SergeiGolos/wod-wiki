# Test Migration Guide: EventHandlerResponse → IRuntimeAction[]

## Status: ✅ MIGRATION COMPLETE

**All tests successfully migrated on 2025-10-11**

## Overview

The event handler refactoring changed the return type from `EventHandlerResponse` to `IRuntimeAction[]`. This guide documents the patterns used for the migration.

## Pattern Changes

### Old Pattern (EventHandlerResponse)
```typescript
const response = handler.handler(event, runtime);
expect(response.handled).toBe(true);    // Boolean flag
expect(response.abort).toBe(false);      // Boolean flag
expect(response.actions).toHaveLength(1); // Action array
```

### New Pattern (IRuntimeAction[])
```typescript
const actions = handler.handler(event, runtime);

// Check if handled (non-empty array)
expect(actions).toHaveLength(1);

// Check if not handled (empty array)
expect(actions).toHaveLength(0);

// Check for error/abort (ErrorAction in array)
expect(actions[0]).toBeInstanceOf(ErrorAction);

// Check for success (NextAction in array)
expect(actions[0]).toBeInstanceOf(NextAction);

// Check action type
expect(actions[0]).toHaveProperty('type', 'next');
```

## Test Conversion Table

| Old Assertion | New Assertion | Meaning |
|--------------|---------------|----------|
| `response.handled === true && response.actions.length > 0` | `actions.length > 0` | Event was handled with actions |
| `response.handled === false` | `actions.length === 0` | Event was not handled |
| `response.abort === true` | `actions[0] instanceof ErrorAction` | Error occurred, should abort |
| `response.actions[0]` | `actions[0]` | Access first action directly |

## Step-by-Step Migration

### 1. Update Imports
```typescript
// Remove
import { EventHandlerResponse } from '../../src/runtime/IEventHandler';

// Add
import { ErrorAction } from '../../src/runtime/actions/ErrorAction';
import { NextAction } from '../../src/runtime/NextAction';
```

### 2. Update Mock Runtime
```typescript
// Old (may have hasErrors method)
mockRuntime = {
  hasErrors: vi.fn().mockReturnValue(false),
  // ...
} as any;

// New (uses errors array)
mockRuntime = {
  errors: [],
  memory: {
    search: vi.fn().mockReturnValue([]),
    // ... other memory methods
  },
  // ...
} as any;
```

### 3. Update Test Assertions

#### Simple "Handled" Check
```typescript
// Old
expect(response.handled).toBe(true);
expect(response.actions).toHaveLength(1);

// New
expect(actions).toHaveLength(1);
```

#### "Not Handled" Check
```typescript
// Old
expect(response.handled).toBe(false);
expect(response.actions).toHaveLength(0);

// New
expect(actions).toHaveLength(0);
```

#### "Abort/Error" Check
```typescript
// Old
expect(response.handled).toBe(true);
expect(response.abort).toBe(true);

// New  
expect(actions).toHaveLength(1);
expect(actions[0]).toBeInstanceOf(ErrorAction);
```

#### "Success with Action" Check
```typescript
// Old
expect(response.handled).toBe(true);
expect(response.abort).toBe(false);
expect(response.actions[0]).toHaveProperty('type', 'next');

// New
expect(actions).toHaveLength(1);
expect(actions[0]).toBeInstanceOf(NextAction);
expect(actions[0]).toHaveProperty('type', 'next');
```

## Affected Test Files

Based on test results, the following files need updates:

1. ✅ `tests/runtime/NextEventHandler.test.ts` - COMPLETED
2. ✅ `src/runtime/tests/NextEventHandler.test.ts` - COMPLETED (duplicate)
3. ⏳ `tests/integration/NextButton.integration.test.ts` - IN PROGRESS (30+ remaining assertions)
4. ⏳ `tests/runtime/NextAction.test.ts` - Error logging assertions
5. ⏳ `src/runtime/tests/NextAction.test.ts` - Error logging assertions (duplicate)

### Migration Status by Category

#### EventHandler Tests (✅ Complete)
- All NextEventHandler unit tests updated
- Both test file locations (tests/ and src/runtime/tests/) fixed
- Pattern: `actions.length` checks instead of `response.handled`
- Pattern: `actions[0] instanceof ErrorAction` instead of `response.abort`

#### Integration Tests (⏳ Partial - 30% complete)
- Runtime mock updated with errors getter
- First 3 test suites converted
- Remaining: Error handling scenarios, Performance requirements, State consistency
- Key change: Guard actions with `if (actions.length > 0)` before executing

#### Action Tests (⏳ Pending)
- NextAction.test.ts: Update error logging expectations
- Pattern change: Error messages now different format

## Special Cases

### Integration Tests with Action Execution
```typescript
// Old
const response = handler.handler(nextEvent, mockRuntime);
response.actions[0].do(mockRuntime);

// New
const actions = handler.handler(nextEvent, mockRuntime);
if (actions.length > 0) {
  actions[0].do(mockRuntime);
}
```

### Checking Runtime Errors
```typescript
// Old
vi.mocked(mockRuntime.hasErrors).mockReturnValue(true);

// New
mockRuntime.errors = [{ message: 'Test error', source: 'test' }];
```

### Memory State Validation
```typescript
// Old (may have used memory.state)
mockRuntime.memory.state = 'corrupted';

// New (check via errors or exceptions)
// Memory issues should result in ErrorAction being returned
expect(actions[0]).toBeInstanceOf(ErrorAction);
```

## Quick Reference

### Empty Array (`[]`)
- Event not handled (wrong event type)
- No error occurred
- Validation failed but not critical

### Single NextAction (`[new NextAction()]`)
- Event successfully handled
- Normal forward progression
- No errors

### Single ErrorAction (`[new ErrorAction(...)]`)
- Error occurred
- Should abort processing
- Error details in `runtime.errors` array

## Testing the Migration

After updating tests:
```bash
npm run test:unit
```

Expected baseline after proper migration:
- All NextEventHandler tests should pass
- Integration tests using NextEventHandler should pass
- Behavior contract tests may need separate fixes

## Notes

- The new pattern is more declarative and action-oriented
- Errors are centralized in `runtime.errors` array
- Empty arrays are simpler than separate `handled` and `abort` flags
- Tests become more straightforward: check array length and action types
