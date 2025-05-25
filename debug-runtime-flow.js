// Debug script to test actual runtime flow
import { RunEvent } from './src/core/runtime/inputs/RunEvent.js';
import { RunHandler } from './src/core/runtime/inputs/RunEvent.js';
import { PushNextAction } from './src/core/runtime/actions/PushNextAction.js';

console.log('=== Testing Timer Runtime Flow ===');

// Test 1: Can we create a RunEvent?
try {
  const runEvent = new RunEvent();
  console.log('✓ RunEvent created:', runEvent.name, runEvent.timestamp);
} catch (error) {
  console.error('✗ Failed to create RunEvent:', error.message);
}

// Test 2: Can we create a RunHandler?
try {
  const runHandler = new RunHandler();
  console.log('✓ RunHandler created');
} catch (error) {
  console.error('✗ Failed to create RunHandler:', error.message);
}

// Test 3: Can we create a PushNextAction?
try {
  const pushNextAction = new PushNextAction();
  console.log('✓ PushNextAction created:', pushNextAction.name);
} catch (error) {
  console.error('✗ Failed to create PushNextAction:', error.message);
}

console.log('=== End of Runtime Flow Test ===');
