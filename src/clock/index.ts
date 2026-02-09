/**
 * Clock Module - Timer Display Stack and Card System
 * 
 * This module provides a stack-based display system for workout timers and cards.
 * Blocks can push/pop timer displays and content cards onto stacks, and the
 * Clock UI automatically renders the current (top) entries.
 * 
 * ## Architecture
 * 
 * ### Timer Stack
 * The timer stack contains ITimerDisplayEntry objects that reference timer
 * memory locations. Each entry specifies:
 * - Which memory location contains the TimeSpan[] data
 * - Display format (countdown vs countup)
 * - Label and buttons to show
 * 
 * ### Card Stack  
 * The card stack contains IDisplayCardEntry objects that describe content
 * to show below the timer. Built-in card types:
 * - 'idle-start' - Shown before workout starts
 * - 'idle-complete' - Shown after workout completes
 * - 'active-block' - Shows current exercise/effort metrics
 * - 'rest-period' - Shows during rest periods
 * - 'custom' - Uses CardComponentRegistry to render custom components
 * 
 * ### Memory Integration
 * The display state is stored in runtime memory using the DISPLAY_STACK_STATE
 * memory type. This allows:
 * - UI components to subscribe to changes
 * - Blocks to push/pop displays via actions
 * - Complete state inspection for debugging
 * 
 * ## Usage
 * 
 * ```tsx
 * // 1. Register default card components on app init
 * import { registerDefaultCards } from '@/clock';
 * registerDefaultCards();
 * 
 * // 2. Use StackedClockDisplay in your UI
 * import { StackedClockDisplay } from '@/clock';
 * 
 * function WorkoutPage() {
 *   return (
 *     <RuntimeProvider runtime={runtime}>
 *       <StackedClockDisplay />
 *     </RuntimeProvider>
 *   );
 * }
 * 
 * // 3. In blocks, push timer/card displays
 * import { PushTimerDisplayAction, PushCardDisplayAction } from '@/runtime/actions';
 * 
 * class MyBlock implements IRuntimeBlock {
 *   mount(runtime: IScriptRuntime): IRuntimeAction[] {
 *     return [
 *       new PushTimerDisplayAction({
 *         id: `timer-${this.key}`,
 *         ownerId: this.key.toString(),
 *         timerMemoryId: this.timerRef.id,
 *         label: 'AMRAP 20',
 *         format: 'countdown',
 *         durationMs: 20 * 60 * 1000,
 *       }),
 *       new PushCardDisplayAction({
 *         id: `card-${this.key}`,
 *         ownerId: this.key.toString(),
 *         type: 'active-block',
 *         title: '10 Burpees',
 *         metrics: [
 *           { type: 'reps', value: 10, image: '10' },
 *           { type: 'effort', value: 'Burpees', image: 'Burpees' }
 *         ]
 *       })
 *     ];
 *   }
 * }
 * ```
 */

// Components
// StackedClockDisplay has been removed - use TimerDisplay from '@/components/workout/TimerDisplay' instead

// Legacy components (for backward compatibility)
export { ClockAnchor } from './anchors/ClockAnchor';
export { DigitalClock } from './components/DigitalClock';
export type { DigitalClockProps } from './components/DigitalClock';

// Types
export type {
  ITimerDisplayEntry,
  IDisplayButton,
  DisplayCardType,
  IDisplayCardEntry,
  IDisplayMetric,
  IDisplayStackState,
} from './types/DisplayTypes';
export { createDefaultDisplayState } from './types/DisplayTypes';

// Hooks (useDisplayStack and related hooks have been removed - deprecated legacy API)

// Card Components
export {
  IdleStartCard,
  IdleCompleteCard,
  ActiveBlockCard,
  RestPeriodCard,
  FallbackCard,
} from './cards/DefaultCards';

// Registry
export { 
  CardComponentRegistry, 
  registerDefaultCards 
} from './registry';
export type { CardComponentProps, CardComponent } from './registry';
