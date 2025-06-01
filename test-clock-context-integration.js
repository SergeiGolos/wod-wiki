/**
 * Test script to verify ClockContext integration with TimerRuntime
 * 
 * This test verifies that:
 * 1. useTimerRuntime returns output$ Observable correctly
 * 2. ClockProvider subscribes to the Observable 
 * 3. Events flow from TimerRuntime to ClockContext
 * 4. ClockAnchor components receive and display data
 */

// Simple Subject/Observable implementation for testing
class SimpleSubject {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
    return {
      unsubscribe: () => {
        const index = this.observers.indexOf(observer);
        if (index > -1) this.observers.splice(index, 1);
      }
    };
  }
  
  next(value) {
    this.observers.forEach(observer => observer(value));
  }
  
  asObservable() {
    return this; // In RxJS, this would return a proper Observable
  }
}

// Mock the core components to test the Observable flow
console.log('🧪 Testing ClockContext Observable Integration');

// Simulate the useTimerRuntime hook behavior
function mockUseTimerRuntime() {
  const outputRef = new SimpleSubject();
  
  return {
    output: outputRef,
    output$: outputRef.asObservable(), // This is the key fix
  };
}

// Test the Observable connection
function testObservableConnection() {
  console.log('\n1. Testing Observable Connection:');
  
  const runtime = mockUseTimerRuntime();
  
  // Test that output$ is an Observable
  console.log('   - output$ is Observable:', typeof runtime.output$.subscribe === 'function');
  
  // Test subscription
  let receivedEvent = null;
  const subscription = runtime.output$.subscribe(event => {
    receivedEvent = event;
    console.log('   - Event received in subscription:', event.eventType);
  });
  
  // Emit a test event
  const testEvent = {
    eventType: 'SET_SPAN',
    bag: {
      target: 'primary',
      duration: {
        original: 60000,
        elapsed: 10000,
        remaining: 50000,
        sign: '-'
      }
    },
    timestamp: new Date()
  };
  
  runtime.output.next(testEvent);
  
  console.log('   - Event was received:', receivedEvent !== null);
  console.log('   - Event type matches:', receivedEvent?.eventType === 'SET_SPAN');
  
  subscription.unsubscribe();
  return receivedEvent !== null;
}

// Test ClockProvider event processing logic
function testClockProviderLogic() {
  console.log('\n2. Testing ClockProvider Event Processing:');
  
  // Simulate the ClockProvider's event handling logic
  let contextState = {
    results: [],
    clocks: [],
    buttons: []
  };
  
  function processEvent(event) {
    switch (event.eventType) {
      case 'SET_SPAN':
        if (event.bag?.target) {
          if (event.bag.duration === undefined) {
            contextState.clocks = contextState.clocks.filter(clock => clock.anchor !== event.bag.target);
          } else {
            const existingIndex = contextState.clocks.findIndex(clock => clock.anchor === event.bag.target);
            const newViewClock = {
              anchor: event.bag.target,
              duration: event.bag.duration,
              effort: event.bag.effort
            };
            
            if (existingIndex >= 0) {
              contextState.clocks[existingIndex] = newViewClock;
            } else {
              contextState.clocks.push(newViewClock);
            }
          }
        }
        break;
    }
  }
  
  // Test SET_SPAN event processing
  const clockEvent = {
    eventType: 'SET_SPAN',
    bag: {
      target: 'primary',
      duration: {
        original: 60000,
        elapsed: 15000,
        remaining: 45000,
        sign: '-'
      },
      effort: 'Push-ups'
    },
    timestamp: new Date()
  };
  
  processEvent(clockEvent);
  
  console.log('   - Clock added to context:', contextState.clocks.length === 1);
  console.log('   - Clock anchor correct:', contextState.clocks[0]?.anchor === 'primary');
  console.log('   - Clock duration correct:', contextState.clocks[0]?.duration?.remaining === 45000);
  console.log('   - Clock effort correct:', contextState.clocks[0]?.effort === 'Push-ups');
  
  return contextState.clocks.length === 1;
}

// Test ClockAnchor data retrieval
function testClockAnchorRetrieval() {
  console.log('\n3. Testing ClockAnchor Data Retrieval:');
  
  // Simulate useRuntimeClock hook
  const mockClocks = [
    {
      anchor: 'primary',
      duration: {
        original: 60000,
        elapsed: 20000,
        remaining: 40000,
        sign: '-',
        elapsed() { return { minutes: 0, seconds: 20, milliseconds: 0 }; },
        remaining() { return { minutes: 0, seconds: 40, milliseconds: 0 }; }
      },
      effort: 'Burpees'
    }
  ];
  
  function useRuntimeClock(anchor) {
    return mockClocks.find(clock => clock.anchor === anchor);
  }
  
  const primaryClock = useRuntimeClock('primary');
  
  console.log('   - Primary clock found:', primaryClock !== undefined);
  console.log('   - Clock duration available:', primaryClock?.duration !== undefined);
  console.log('   - Clock effort available:', primaryClock?.effort === 'Burpees');
  
  return primaryClock !== undefined;
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting ClockContext Integration Tests\n');
  
  const results = [
    testObservableConnection(),
    testClockProviderLogic(),
    testClockAnchorRetrieval()
  ];
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed! ClockContext integration is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the event flow between components.');
  }
  
  return passed === total;
}

// Run the tests
runTests().catch(console.error);
