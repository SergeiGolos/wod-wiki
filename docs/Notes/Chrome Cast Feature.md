# Chrome Cast Feature

## Overview
This document outlines the implementation of a Chrome Cast receiver application for the wod.wiki platform. This feature will allow users to cast workout information to ChromeCast-enabled devices.

## Requirements

1. Create a custom Storybook path (`/cast`) for the ChromeCast receiver application
2. Enable Tailwind CSS for the receiver application
3. Implement a placeholder component that displays events in a list format
4. Process and display events received from a casting device

## Implementation Details

### Storybook Configuration
We need to extend the existing Storybook configuration to create a custom path (`/cast`) that will serve as the entry point for our ChromeCast receiver application.

```javascript
// .storybook/main.js modifications
module.exports = {
  // existing configuration
  
  // Add custom path for ChromeCast receiver
  staticDirs: [
    // existing staticDirs
    { from: '../public', to: '/' }
  ],
  
  // Add custom Webpack configuration for the /cast path
  async webpackFinal(config) {
    // existing configuration
    
    // Add ChromeCast receiver entry point
    config.entry.push('./src/cast/index.tsx');
    
    return config;
  }
}
```

### Tailwind CSS Integration
Ensure Tailwind CSS is properly configured for the ChromeCast receiver application:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    // existing content paths
    './src/cast/**/*.{js,jsx,ts,tsx}', // Add cast directory
  ],
  // rest of configuration
}
```

### ChromeCast Receiver Component Structure

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
        {events.length === 0 ? (
          <p className="text-gray-400">Waiting for events...</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="event-item p-2 mb-2 bg-gray-800 rounded">
              <div className="flex justify-between">
                <span className="font-medium">{event.type}</span>
                <span className="text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-sm mt-1 text-gray-300">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CastReceiver;
```

### Integration with Existing Event System
The ChromeCast receiver will need to integrate with the existing wod.wiki event system:

1. Reuse the same event types and structures used by the platform
2. Convert received ChromeCast messages to the internal event format
3. Display events using similar formatting to the existing EventsView component

## Next Steps

1. Create the directory structure for the ChromeCast receiver
2. Configure Storybook for the custom `/cast` path
3. Implement the basic receiver component
4. Add ChromeCast SDK integration
5. Test with a sender application
