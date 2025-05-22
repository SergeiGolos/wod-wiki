# Chromecast Receiver Implementation

This document details the practical implementation of the Chromecast receiver application in wod.wiki, including code samples and integration patterns.

## Receiver Component Structure

The main receiver component handles the display of cast content on the Chromecast device:

```typescript
// src/cast/CastReceiver.tsx
interface Event {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
}

const CastReceiver: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  
  // Initialize ChromeCast receiver
  useEffect(() => {
    // ChromeCast initialization code
    // Listen for events from sender applications
  }, []);
  
  // Add event to the list
  const handleEvent = (event: Event) => {
    setEvents(prev => [...prev, event]);
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">wod.wiki Cast Receiver</h1>
      <div className="events-list">
        {/* Event display logic */}
      </div>
    </div>
  );
};
```

## Hook: useCastReceiver

The `useCastReceiver` hook encapsulates the logic for initializing and managing the receiver application:

```typescript
export function useCastReceiver() {
  const [events, setEvents] = useState<CastEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // 1. Initialize cast.framework.CastReceiverContext
    const context = cast.framework.CastReceiverContext.getInstance();
    
    // 2. Configure message listeners
    context.addCustomMessageListener(CAST_NAMESPACE, (event) => {
      const castEvent = event.data as CastEvent;
      handleEvent(castEvent);
    });
    
    // 3. Start the receiver
    context.start({
      disableIdleTimeout: true,
      statusText: "Ready to receive workouts"
    });
    
    return () => {
      // Clean up
      context.stop();
    };
  }, []);
  
  // Handler for incoming events
  const handleEvent = (event: CastEvent) => {
    setEvents(prev => [...prev, event]);
    
    // Process event based on type
    switch (event.type) {
      case 'TIMER_UPDATE':
        // Update timer display
        break;
      case 'ACTIVE_BLOCK':
        // Update current exercise
        break;
      // Other event types...
    }
  };
  
  return {
    events,
    isConnected
  };
}
```

## Integration with Existing Event System

The Chromecast receiver integrates with the existing wod.wiki event system:

1. **Event Translation**: 
   ```typescript
   // Converting runtime OutputEvent to cast-friendly format
   function convertToCastEvent(outputEvent: OutputEvent): CastEvent {
     return {
       id: uuid(),
       type: outputEvent.type,
       timestamp: Date.now(),
       payload: outputEvent.payload
     };
   }
   ```

2. **Event Processing**:
   The receiver handles various event types from the runtime:
   - `SET_CLOCK`: Updates timer display
   - `SET_TEXT`: Updates exercise text
   - `SET_BUTTONS`: Updates available controls
   - `UPDATE_METRICS`: Updates workout metrics
   - `SET_ACTIVE_BLOCK`: Updates the current active block

## UI Components

The receiver UI is optimized for TV display:

1. **TimerDisplay**: Large, visible countdown/countup timer
2. **ExerciseDisplay**: Current exercise with reps/weights
3. **MetricsPanel**: Workout stats (total time, rounds completed, etc.)
4. **EventList**: Timeline of workout events

## Testing and Development

### Local Testing Environment

For development without an actual Chromecast device:

```typescript
// src/cast/hooks/useLocalCast.ts
export function useLocalCast(): {
  localEvents: CastEvent[];
  sendLocalCastEvent: (event: OutputEvent) => void;
} {
  const [localEvents, setLocalEvents] = useState<CastEvent[]>([]);
  
  const sendLocalCastEvent = useCallback((event: OutputEvent) => {
    const castEvent = convertToCastEvent(event);
    setLocalEvents(prev => [...prev, castEvent]);
  }, []);
  
  return {
    localEvents,
    sendLocalCastEvent
  };
}
```

### Storybook Configuration

The receiver can be tested in Storybook:

```typescript
// src/stories/ChromeCast.stories.tsx
export default {
  title: 'Cast/Receiver',
  component: CastReceiver
};

export const EmptyReceiver = () => <CastReceiver />;

export const WithTimerEvents = () => {
  // Mock implementation with sample events
  return <CastReceiver initialEvents={mockTimerEvents} />;
};
```

## Styling for TV Displays

The receiver UI uses Tailwind CSS with TV-optimized styles:

- High contrast colors
- Large text sizes (minimum 24px for readability)
- Simple, clean layout with plenty of whitespace
- Limited animations to avoid burn-in

## Error Handling

The receiver implements robust error handling:

```typescript
try {
  // Process incoming message
} catch (error) {
  console.error('Error processing cast message:', error);
  
  // Display user-friendly error in UI
  setErrorMessage('Unable to process workout data');
  
  // Report error to sender if possible
  if (context.canSendMessage()) {
    context.sendCustomMessage(CAST_NAMESPACE, undefined, {
      type: 'ERROR',
      message: error.message
    });
  }
}
```