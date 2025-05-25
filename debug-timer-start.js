// Debug script to test timer start flow
const testWorkout = `
30s walk
10 squat
`;

console.log('Testing timer start flow with:', testWorkout);

// Test if we can simulate the flow
console.log('1. User clicks run button');
console.log('2. RunEvent should be created');
console.log('3. RunHandler should process event and return PushNextAction');
console.log('4. PushNextAction should call current block.next()');
console.log('5. If current block is IdleRuntimeBlock, next() returns PopBlockAction');
console.log('6. PopBlockAction should remove IdleRuntimeBlock from stack');
console.log('7. RootBlock should become current and its next() should be called');
console.log('8. RootBlock.next() should push first statements');

// Check environment
console.log('NODE_ENV:', process.env.NODE_ENV);
