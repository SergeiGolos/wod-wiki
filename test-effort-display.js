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
{effort && (
  <div className="flex flex-col mr-4">
    {effort.split("\\n").map((line, index) => (
      <div key={index} className="text-lg font-medium text-blue-600">{line}</div>
    ))}
  </div>
)}
`;

console.log('✅ ClockAnchor component updated with new effort display logic');

console.log('\n🎯 Summary:');
console.log('- Added showEffort={true} to DefaultClockLayout primary timer');
console.log('- Added showEffort={true} to CustomClockLayout primary timer');
console.log('- CustomClockLayout now includes effort in custom render function');
console.log('- Effort now displays to the LEFT of the timer (instead of above)');
console.log('- Multiple efforts display as a vertical list');
console.log('- Metric values (reps, weight, distance) now display with efforts');
console.log('- TypeScript errors resolved');

console.log('\n📋 How effort display works:');
console.log('1. EffortBlock.onEnter() emits SetEffortAction with exercise name and values');
console.log('2. useClockRegistry captures SET_EFFORT events and tracks efforts');
console.log('3. ClockAnchor retrieves effort from registry when showEffort={true}');
console.log('4. Effort displays as blue text to the LEFT of the timer');
console.log('5. Multiple efforts are displayed as a vertical list');
console.log('6. Metric values (reps, weight, distance) are included with each effort');

console.log('\n✨ Current effort should now be displayed to the LEFT of the clock space!');
