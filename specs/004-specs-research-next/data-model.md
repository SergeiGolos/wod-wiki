# Data Model: Next Button Integration

**Feature**: Next Button Integration
**Date**: 2025-10-04
**Type**: Event-driven runtime system enhancement

## Core Data Entities

### NextEvent
```typescript
interface NextEvent extends IEvent {
  readonly name: 'next';
  readonly timestamp: Date;
  readonly data?: {
    source?: string;
    metadata?: Record<string, any>;
  };
}
```

**Purpose**: Represents a user-triggered request to advance script execution by one step.

**Key Characteristics**:
- Immutable event structure
- Accurate timestamp for handler calculations
- Optional metadata for debugging and analytics
- Minimal footprint for performance

### NextEventHandler
```typescript
interface NextEventHandler extends IEventHandler {
  readonly id: string;
  readonly name: 'next-handler';

  handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse;
}
```

**Purpose**: Processes NextEvent instances and determines appropriate advancement actions.

**Key Characteristics**:
- Event filtering (only processes 'next' events)
- Runtime state validation
- Sequential action generation
- Error handling and boundary detection

### NextAction
```typescript
interface NextAction extends IRuntimeAction {
  readonly type: 'next';

  do(runtime: IScriptRuntime): void;
}
```

**Purpose**: Advances execution state by invoking current block's next() method.

**Key Characteristics**:
- Single responsibility: advance execution
- Memory-safe operation
- Error boundary handling
- State transition logging

## Data Flow Architecture

### Event Flow
```
User Click → NextEvent → ScriptRuntime.handle() → NextEventHandler.handler() → NextAction.do() → UI Update
```

### State Transitions
1. **Normal Execution**: Current block → Next block(s)
2. **Script Completion**: Current block → No more blocks → Disable button
3. **Error State**: Current block → Error handler → Stop execution
4. **Invalid State**: Invalid runtime → Prevent advancement

### Memory Management
- **Event Objects**: Short-lived, garbage collected after processing
- **Handler Instances**: Long-lived, registered in runtime memory
- **Action Objects**: Short-lived, executed and discarded
- **UI State**: Managed by React component lifecycle

## Integration Points

### Runtime Memory Integration
```typescript
// Handler registration pattern
this.memory.allocate('handler', this.key.toString(), {
  name: 'next-handler',
  handler: this.handleNext.bind(this)
});
```

### Component State Integration
```typescript
// UI state management
const [stepVersion, setStepVersion] = useState(0);
const [isEndOfScript, setIsEndOfScript] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Event Queue Integration
```typescript
// Click queuing for rapid interactions
const clickQueue = useRef<Array<() => void>>([]);
const isProcessing = useRef(false);
```

## Data Validation Rules

### NextEvent Validation
- Must have 'next' name
- Must have valid timestamp
- Data payload must be serializable
- Must implement IEvent interface

### Handler Response Validation
- Must return EventHandlerResponse
- Actions array must be valid IRuntimeAction instances
- Handled flag must be boolean
- Abort flag must be boolean

### Action Execution Validation
- Runtime must be in valid state
- Current block must exist
- Block must implement next() method
- Memory must be accessible

## Error Handling Data

### Error Types
```typescript
enum NextButtonErrorType {
  NO_ACTIVE_SCRIPT = 'NO_ACTIVE_SCRIPT',
  MEMORY_CORRUPTION = 'MEMORY_CORRUPTION',
  PREVIOUS_FAILURE = 'PREVIOUS_FAILURE',
  INVALID_STATE = 'INVALID_STATE',
  EXECUTION_ERROR = 'EXECUTION_ERROR'
}

interface NextButtonError {
  type: NextButtonErrorType;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}
```

### Recovery State
```typescript
interface RecoveryState {
  lastKnownGoodState: any;
  error: NextButtonError;
  retryAvailable: boolean;
  timestamp: Date;
}
```

## Performance Considerations

### Memory Usage
- **NextEvent**: ~50 bytes per instance
- **NextEventHandler**: ~200 bytes (long-lived)
- **NextAction**: ~30 bytes per instance
- **Click Queue**: Variable, bounded by user interaction rate

### Processing Time
- **Event Creation**: <1ms
- **Handler Discovery**: <5ms (memory search)
- **Action Execution**: <10ms (block.next() call)
- **UI Update**: <20ms (React render)

### Garbage Collection
- Events and actions collected immediately after use
- Handlers persist for runtime lifetime
- No memory leaks expected with proper disposal

## Testing Data Requirements

### Unit Test Data
- Mock NextEvent instances with various timestamps
- Mock runtime states (normal, error, completion)
- Mock block implementations with controlled next() behavior

### Integration Test Data
- Real workout scripts of varying complexity
- Simulated user interaction patterns
- Error injection scenarios
- Performance benchmark data

## Security Considerations

### Input Validation
- Event data must be sanitized
- Timestamp validation prevents manipulation
- Memory access bounds checking

### Error Information Exposure
- Error messages sanitized for user display
- Internal state not exposed in errors
- Logging captures full context for debugging

## Future Extensibility

### Event Evolution
- Additional event types (previous, pause, resume)
- Enhanced metadata support
- Batch event processing capabilities

### Handler Evolution
- Pluggable handler strategies
- Conditional handler execution
- Handler priority and ordering

### Action Evolution
- Composite action patterns
- Conditional action execution
- Action rollback capabilities