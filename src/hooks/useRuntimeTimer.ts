/**
 * useRuntimeTimer — Public hook boundary for runtime timer access.
 *
 * Re-exports all timer-related hooks and types from the runtime layer
 * so that components in `src/components/` never need to import directly
 * from `src/runtime/`.
 *
 * Follows the pattern established in `useWorkoutEvents.ts`:
 *   single responsibility, re-export stable contracts, no side effects
 *   in the hook body outside `useEffect`/`useCallback`.
 */

// ── Runtime hooks ─────────────────────────────────────────────────────────
export { useTimerElapsed } from '@/runtime/hooks/useTimerElapsed';
export { useRoundDisplay } from '@/runtime/hooks/useBlockMemory';
export { useNextPreview } from '@/runtime/hooks/useNextPreview';
export { useRuntimeExecution } from '@/runtime/hooks/useRuntimeExecution';
export type { UseRuntimeExecutionReturn } from '@/runtime/hooks/useRuntimeExecution';
export { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
export { useWorkoutTracker } from '@/runtime/hooks/useWorkoutTracker';

// ── Runtime context ───────────────────────────────────────────────────────
export { useScriptRuntime, ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';

// ── Runtime contracts (types only) ───────────────────────────────────────
export type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
export type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
export type { StackSnapshot } from '@/runtime/contracts/IRuntimeStack';
export type { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
export type { IEventHandler } from '@/runtime/contracts/events/IEventHandler';
export type { IEvent } from '@/runtime/contracts/events/IEvent';

// ── Runtime memory ────────────────────────────────────────────────────────
export type { MetricVisibility } from '@/runtime/memory/MetricVisibility';
export { VISIBILITY_LABELS, VISIBILITY_ICONS } from '@/runtime/memory/MetricVisibility';

// ── Runtime events & actions ──────────────────────────────────────────────
export { NextEvent } from '@/runtime/events/NextEvent';
export { RegisterEventHandlerAction } from '@/runtime/actions/events/RegisterEventHandlerAction';
export { UnregisterEventHandlerAction } from '@/runtime/actions/events/UnregisterEventHandlerAction';

// ── Runtime subscriptions ─────────────────────────────────────────────────
export { SubscriptionManager } from '@/runtime/subscriptions/SubscriptionManager';
export { LocalRuntimeSubscription } from '@/runtime/subscriptions/LocalRuntimeSubscription';

// ── Runtime tracking ──────────────────────────────────────────────────────
export { WorkoutTracker } from '@/runtime/tracking/WorkoutTracker';

// ── Runtime adapters & logging ────────────────────────────────────────────
export { RuntimeAdapter } from '@/runtime/adapters/RuntimeAdapter';
export { RuntimeLogger } from '@/runtime/RuntimeLogger';
export type { MemoryEntry } from '@/runtime/types/executionSnapshot';

// ── ScriptRuntime class (for type-safe prop passing) ─────────────────────
export { ScriptRuntime } from '@/runtime/ScriptRuntime';
