// Provider interfaces and types
export * from './IBehaviorProvider';
export * from './CompilationContext';
export * from './BehaviorValidation';
export * from './ComposableBlockCompiler';

// Core providers
export * from './core';

// Default provider set factory
import { IBehaviorProvider } from './IBehaviorProvider';
import {
  InfrastructureProvider,
  BoundTimerProvider,
  UnboundTimerProvider,
  LapTimerProvider,
  ChildIndexProvider,
  RoundPerLoopProvider,
  RoundPerNextProvider,
  SinglePassProvider,
  BoundLoopProvider,
  UnboundLoopProvider,
  ChildExecutionProvider,
  TimerCompletionProvider,
  HistoryProvider,
  RoundDisplayProvider,
  RoundSpanProvider,
  AudioProvider,
  IntervalProvider,
  RepSchemeProvider,
} from './core';

/**
 * Creates the default set of behavior providers.
 * These are ordered by priority and cover all standard block types.
 */
export function createDefaultProviders(): IBehaviorProvider[] {
  return [
    // Infrastructure (always first)
    new InfrastructureProvider(),
    
    // Timing
    new BoundTimerProvider(),
    new UnboundTimerProvider(),
    new LapTimerProvider(),
    
    // Loop control
    new ChildIndexProvider(),
    new RoundPerLoopProvider(),
    new RoundPerNextProvider(),
    
    // Loop termination
    new SinglePassProvider(),
    new BoundLoopProvider(),
    new UnboundLoopProvider(),
    
    // Child execution
    new ChildExecutionProvider(),
    
    // Completion
    new TimerCompletionProvider(),
    
    // Rep scheme
    new RepSchemeProvider(),
    
    // Interval-specific
    new IntervalProvider(),
    
    // Tracking
    new HistoryProvider(),
    new RoundDisplayProvider(),
    new RoundSpanProvider(),
    
    // Audio
    new AudioProvider(),
  ];
}
