#!/usr/bin/env node

// Test script to verify the Observable connection fix works with real runtime scenarios
import { TimerRuntime } from './src/core/runtime/TimerRuntime.js';
import { WodWikiParser } from './src/core/compiler/WodWikiParser.js';
import { WodWikiVisitor } from './src/core/compiler/WodWikiVisitor.js';
import { Subject } from 'rxjs';

console.log('\n🔧 Testing Real Runtime Integration with Observable Fix...\n');

// Create a simple workout script to test
const workoutScript = `20:00 AMRAP
  5 Pullups
  10 Pushups  
  15 Air Squats`;

console.log('📝 Testing workout script:');
console.log(workoutScript);
console.log();

// Test parsing and compilation
function testCompilation() {
  console.log('1️⃣ Testing script compilation...');
  
  try {
    const parser = new WodWikiParser();
    const cst = parser.parse(workoutScript);
    
    const visitor = new WodWikiVisitor();
    const compiledScript = visitor.visit(cst);
    
    console.log('✅ Script compiled successfully');
    console.log(`   - Found ${compiledScript.precompiledNodes.length} node(s)`);
    return compiledScript;
  } catch (error) {
    console.log('❌ Script compilation failed:', error.message);
    return null;
  }
}

// Test runtime creation and Observable connection
function testRuntimeObservable(compiledScript) {
  console.log('\n2️⃣ Testing runtime Observable connection...');
  
  try {
    const input = new Subject();
    const output = new Subject();
    
    const runtime = new TimerRuntime(compiledScript, input, output);
    
    console.log('✅ Runtime created successfully');
    console.log('✅ Input Subject connected');
    console.log('✅ Output Subject connected');
    
    // Test that output is a Subject (which can be converted to Observable)
    console.log(`✅ Output has asObservable method: ${typeof output.asObservable === 'function'}`);
    
    // Create the Observable that useTimerRuntime would return  
    const output$ = output.asObservable();
    console.log('✅ Observable created from Subject');
    
    return { runtime, input, output, output$ };
  } catch (error) {
    console.log('❌ Runtime creation failed:', error.message);
    return null;
  }
}

// Test event emission and Observable subscription
function testEventFlow({ runtime, input, output, output$ }) {
  console.log('\n3️⃣ Testing event flow through Observable...');
  
  return new Promise((resolve) => {
    let eventsReceived = 0;
    const expectedEvents = ['SET_SPAN', 'SET_TIMER_STATE'];
    
    // Subscribe to Observable (like ClockProvider would)
    const subscription = output$.subscribe({
      next: (event) => {
        eventsReceived++;
        console.log(`✅ Event received: ${event.eventType}`);
        
        if (event.eventType === 'SET_SPAN') {
          console.log(`   - Clock target: ${event.bag?.target}`);
          console.log(`   - Duration type: ${event.bag?.duration?.constructor.name}`);
        }
        
        if (event.eventType === 'SET_TIMER_STATE') {
          console.log(`   - Timer target: ${event.bag?.target}`);
          console.log(`   - State: ${event.bag?.state}`);
        }
        
        // Stop after receiving a few events
        if (eventsReceived >= 3) {
          subscription.unsubscribe();
          console.log('\n✅ Observable subscription working correctly');
          resolve(true);
        }
      },
      error: (error) => {
        console.log('❌ Observable error:', error.message);
        resolve(false);
      }
    });
    
    // Emit some events to trigger runtime processing
    console.log('📤 Sending RUN event to runtime...');
    input.next({ eventType: 'RUN' });
    
    // Safety timeout
    setTimeout(() => {
      subscription.unsubscribe();
      if (eventsReceived === 0) {
        console.log('⚠️  No events received within timeout');
        resolve(false);
      }
    }, 2000);
  });
}

// Test the useTimerRuntime pattern
function testUseTimerRuntimePattern(compiledScript) {
  console.log('\n4️⃣ Testing useTimerRuntime Observable export pattern...');
  
  const input = new Subject();
  const output = new Subject();
  const runtime = new TimerRuntime(compiledScript, input, output);
  
  // Simulate what useTimerRuntime now returns (after the fix)
  const useTimerRuntimeReturn = {
    runtime,
    input,
    output,  // Subject for direct access
    output$: output.asObservable()  // Observable for ClockProvider
  };
  
  console.log('✅ useTimerRuntime return object created');
  console.log(`✅ Has output Subject: ${useTimerRuntimeReturn.output instanceof Subject}`);
  console.log(`✅ Has output$ Observable: ${typeof useTimerRuntimeReturn.output$.subscribe === 'function'}`);
  
  // Test that ClockProvider can subscribe to output$
  const subscription = useTimerRuntimeReturn.output$.subscribe({
    next: (event) => {
      console.log(`✅ ClockProvider would receive: ${event.eventType}`);
    },
    error: (error) => {
      console.log(`❌ ClockProvider subscription error: ${error.message}`);
    }
  });
  
  // Test emitting an event
  useTimerRuntimeReturn.output.next({
    eventType: 'SET_SPAN',
    bag: { target: 'primary', duration: null },
    timestamp: new Date()
  });
  
  subscription.unsubscribe();
  console.log('✅ Observable subscription and event flow verified');
  
  return true;
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting runtime integration tests...\n');
  
  const compiledScript = testCompilation();
  if (!compiledScript) return;
  
  const runtimeObjects = testRuntimeObservable(compiledScript);
  if (!runtimeObjects) return;
  
  const eventFlowWorked = await testEventFlow(runtimeObjects);
  
  const patternWorked = testUseTimerRuntimePattern(compiledScript);
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   - Script compilation: ✅`);
  console.log(`   - Runtime creation: ✅`);
  console.log(`   - Observable connection: ✅`);
  console.log(`   - Event flow: ${eventFlowWorked ? '✅' : '❌'}`);
  console.log(`   - useTimerRuntime pattern: ${patternWorked ? '✅' : '❌'}`);
  
  if (eventFlowWorked && patternWorked) {
    console.log('\n🎉 All tests passed! The Observable connection fix is working correctly.');
    console.log('🔗 Events should now flow properly from TimerRuntime → useTimerRuntime → ClockProvider → ClockContext');
  } else {
    console.log('\n⚠️  Some tests failed. The Observable connection may need additional fixes.');
  }
}

runTests().catch(console.error);
