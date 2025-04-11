import React, { useState, useEffect } from 'react';

interface Event {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
}

/**
 * ChromeCast Receiver component that displays events received from a casting device
 */
const CastReceiver: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  
  // Initialize ChromeCast receiver
  useEffect(() => {
    console.log('Initializing ChromeCast receiver app');
    
    // Add sample event for demonstration purposes
    const sampleEvent: Event = {
      id: crypto.randomUUID(),
      type: 'INITIALIZATION',
      timestamp: Date.now(),
      payload: { message: 'ChromeCast receiver initialized' }
    };
    
    setEvents([sampleEvent]);
    
    // TODO: Implement actual ChromeCast receiver SDK integration
    // This would include connecting to the ChromeCast framework
    // and setting up message listeners
    
    return () => {
      // Cleanup when component unmounts
      console.log('Cleaning up ChromeCast receiver');
    };
  }, []);
  
  // Add event to the list
  const handleEvent = (event: Event) => {
    console.log('Received event:', event);
    setEvents(prev => [...prev, event]);
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">wod.wiki Cast Receiver</h1>
        <p className="text-gray-400">Displaying workout events from sender devices</p>
      </header>
      
      <div className="events-list space-y-3">
        {events.length === 0 ? (
          <div className="text-gray-400 p-4 bg-gray-800 rounded text-center">
            Waiting for events...
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="event-item p-3 bg-gray-800 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium px-2 py-1 bg-blue-800 rounded text-sm">
                  {event.type}
                </span>
                <span className="text-gray-400 text-sm">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-sm mt-1 text-gray-300 bg-gray-850 p-2 rounded overflow-x-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
      
      {/* For testing only - this would be removed in production */}
      <div className="mt-6 border-t border-gray-800 pt-4">
        <button
          className="px-4 py-2 bg-blue-600 rounded"
          onClick={() => {
            handleEvent({
              id: crypto.randomUUID(),
              type: 'TEST_EVENT',
              timestamp: Date.now(),
              payload: { message: 'Test event triggered manually' }
            });
          }}
        >
          Add Test Event
        </button>
      </div>
    </div>
  );
};

export default CastReceiver;
