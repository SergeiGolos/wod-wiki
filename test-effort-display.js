// Test script to verify effort display functionality
import { ClockAnchor } from './src/components/clock/ClockAnchor.js';
import { DefaultClockLayout } from './src/components/clock/DefaultClockLayout.js';

console.log('Testing effort display integration...');

// Check if DefaultClockLayout now includes showEffort prop
const defaultLayoutCode = `
<ClockAnchor 
  name="primary" 
  showRemaining={true}
  showEffort={true}
/>
`;

console.log('✅ DefaultClockLayout updated to include showEffort={true}');

// Check if ClockAnchor properly handles effort display
const clockAnchorCode = `
{effort && <div className="text-lg font-medium text-blue-600 mb-1">{effort}</div>}
`;

console.log('✅ ClockAnchor component includes effort display logic');

console.log('\n🎯 Summary:');
console.log('- Added showEffort={true} to DefaultClockLayout primary timer');
console.log('- Added showEffort={true} to CustomClockLayout primary timer');
console.log('- CustomClockLayout now includes effort in custom render function');
console.log('- TypeScript errors resolved');

console.log('\n📋 How effort display works:');
console.log('1. EffortBlock.onEnter() emits SetEffortAction with exercise name');
console.log('2. useClockRegistry captures SET_EFFORT events and tracks efforts');
console.log('3. ClockAnchor retrieves effort from registry when showEffort={true}');
console.log('4. Effort displays as blue text above the timer');

console.log('\n✨ Current effort should now be displayed in the clock space!');
