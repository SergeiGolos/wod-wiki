// Debug script to test effort flow with real workout script
import { MdTimerRuntime } from './src/core/parser/md-timer.js';
import { RuntimeScript } from './src/core/runtime/RuntimeScript.js';
import { RuntimeJit } from './src/core/runtime/RuntimeJit.js';
import { TimerRuntime } from './src/core/runtime/TimerRuntime.js';
import { Subject } from 'rxjs';
import { RunEvent } from './src/core/runtime/inputs/RunEvent.js';

console.log('=== Testing Effort Flow with Real Workout ===');

const testWorkout = `10 Push-ups
15 Squats (50kg)
Run 400m`;

console.log('Workout Script:');
console.log(testWorkout);
console.log('');

try {
  // 1. Parse the workout
  const parser = new MdTimerRuntime();
  const script = parser.read(testWorkout);
  
  console.log('✓ Parsed successfully');
  console.log(`Found ${script.statements.length} statements`);
  
  // 2. Create runtime components
  const runtimeScript = new RuntimeScript(script);
  const runtimeJit = new RuntimeJit(runtimeScript, {});
  const input$ = new Subject();
  const output$ = new Subject();
  
  // 3. Create timer runtime
  const runtime = new TimerRuntime('test', runtimeScript, runtimeJit, input$, output$);
  
  console.log('✓ Runtime created');
  console.log(`Stack size: ${runtime.trace.size()}`);
  
  // 4. Listen for output events (including SET_EFFORT)
  const events = [];
  output$.subscribe(event => {
    events.push(event);
    console.log(`📤 Event: ${event.eventType}`, event.bag);
  });
  
  // 5. Start the workout
  console.log('\n--- Starting workout ---');
  input$.next(new RunEvent());
  
  // Let it process
  setTimeout(() => {
    console.log('\n--- After 100ms ---');
    console.log(`Total events received: ${events.length}`);
    
    const effortEvents = events.filter(e => e.eventType === 'SET_EFFORT');
    console.log(`SET_EFFORT events: ${effortEvents.length}`);
    
    effortEvents.forEach((event, i) => {
      console.log(`  ${i+1}. Target: ${event.bag.target}, Effort: ${event.bag.effort}`);
    });
    
    const clockEvents = events.filter(e => e.eventType === 'SET_SPAN');
    console.log(`SET_SPAN events: ${clockEvents.length}`);
    
    clockEvents.forEach((event, i) => {
      console.log(`  ${i+1}. Target: ${event.bag.target}, Effort: ${event.bag.effort || 'none'}`);
    });
    
    // Check what's on the runtime stack
    console.log(`\nCurrent stack size: ${runtime.trace.size()}`);
    if (runtime.trace.current()) {
      console.log(`Current block: ${runtime.trace.current().constructor.name}`);
    }
    
    process.exit(0);
  }, 100);
  
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
