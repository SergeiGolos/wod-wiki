# Interface Contract: IEvent

**File**: `src/runtime/IEvent.ts`
**Purpose**: Defines the standard interface for all runtime events

## Interface Definition

```typescript
export interface IEvent {
  name: string;
  timestamp: Date;
  data?: any;
}
```

## Implementation Requirements

### NextEvent Implementation
```typescript
export class NextEvent implements IEvent {
  readonly name = 'next';
  readonly timestamp = new Date();
  readonly data?: any;

  constructor(data?: any) {
    this.data = data;
  }
}
```

## Contract Constraints

### Required Properties
- `name`: Must be exactly 'next' for NextEvent instances
- `timestamp`: Must be accurate Date object at time of creation
- `data`: Optional, must be serializable if provided

### Immutability Requirements
- All properties must be readonly
- No methods allowed that modify state
- Constructor only for initial setup

### Performance Requirements
- Constructor must complete in <1ms
- Memory footprint must be <50 bytes
- No side effects in constructor

## Usage Pattern

```typescript
// Event creation
const event = new NextEvent({
  source: 'user-click',
  metadata: { clickCount: 1 }
});

// Event handling
runtime.handle(event);
```

## Testing Requirements

### Unit Tests
- Test event creation with and without data
- Test immutability of all properties
- Test timestamp accuracy
- Test interface compliance

### Integration Tests
- Test event propagation through runtime
- Test handler discovery and execution
- Test error handling in event processing