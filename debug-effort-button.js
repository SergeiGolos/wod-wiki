// Debug script to test EffortBlock button display
import { EffortBlock } from './src/core/runtime/blocks/EffortBlock.js';
import { SetButtonsAction } from './src/core/runtime/outputs/SetButtonsAction.js';
import { completeButton } from './src/components/buttons/timerButtons.js';

console.log('=== Testing EffortBlock Button Display ===');

// Test 1: Can we create an EffortBlock?
try {
  // Create a minimal JitStatement for testing
  const mockJitStatement = {
    id: 1,
    children: [],
    fragments: [],
    meta: { index: 0 },
    duration: () => undefined,
    selectMany: () => []
  };
  
  const effortBlock = new EffortBlock([mockJitStatement]);
  console.log('✓ EffortBlock created:', effortBlock.constructor.name);
  
  // Test the onEnter method directly
  const mockRuntime = {
    trace: { current: () => effortBlock },
    apply: (actions, block) => {
      console.log(`📝 Runtime.apply called with ${actions.length} actions from ${block.constructor.name}`);
      actions.forEach(action => {
        console.log(`   - Action: ${action.name} (${action.constructor.name})`);
        if (action instanceof SetButtonsAction) {
          console.log(`     * Buttons: ${action.buttons?.length || 0} buttons, target: ${action.target}`);
          if (action.buttons) {
            action.buttons.forEach(btn => console.log(`       - ${btn.label}`));
          }
        }
      });
    }
  };
  
  console.log('\n--- Testing onEnter method ---');
  const enterActions = effortBlock.onEnter(mockRuntime);
  console.log(`✓ onEnter returned ${enterActions.length} actions:`);
  
  enterActions.forEach((action, index) => {
    console.log(`  ${index + 1}. ${action.name} (${action.constructor.name})`);
    if (action instanceof SetButtonsAction) {
      console.log(`     - Target: ${action.target}`);
      console.log(`     - Buttons: ${action.buttons?.length || 0}`);
      if (action.buttons) {
        action.buttons.forEach(btn => console.log(`       * ${btn.label}`));
      }
    }
  });
  
} catch (error) {
  console.error('✗ Failed to test EffortBlock:', error.message);
  console.error(error.stack);
}

console.log('\n=== End of EffortBlock Test ===');
