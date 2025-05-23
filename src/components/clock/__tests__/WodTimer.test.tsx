import { render, screen } from '@testing-library/react';
import { WodTimer } from '../WodTimer';
import { OutputEvent } from '@/core/OutputEvent';
import { TimeSpanDuration } from '@/core/TimeSpanDuration';
import { TimerState } from '@/core/runtime/outputs/SetTimerStateAction';
import { ISpanDuration } from '@/core/ISpanDuration';
import React from 'react';

// Mock child component that displays clock data from context
const TestClockDisplay = () => {
  const clockContext = React.useContext(ClockContext);
  return (
    <div>
      <div data-testid="is-running">{clockContext.isRunning.toString()}</div>
      <div data-testid="is-countdown">{clockContext.isCountdown.toString()}</div>
      <div data-testid="primary-available">
        {Boolean(clockContext.registry.durations.get('primary')).toString()}
      </div>
    </div>
  );
};

// Mock the ClockContext to avoid circular imports in tests
import { createContext } from 'react';
const ClockContext = createContext({
  registry: {
    durations: new Map(),
    states: new Map()
  },
  isRunning: false,
  isCountdown: false
});

// Mock the useClockRegistry hook
jest.mock('@/hooks', () => ({
  useClockRegistry: jest.fn((events) => {
    const durations = new Map();
    const states = new Map();
    
    // Process SET_CLOCK events
    events.filter(e => e.eventType === 'SET_CLOCK' && e.bag?.target && e.bag?.duration)
      .forEach(e => durations.set(e.bag.target, e.bag.duration));
    
    // Process SET_TIMER_STATE events
    events.filter(e => e.eventType === 'SET_TIMER_STATE' && e.bag?.target && e.bag?.state)
      .forEach(e => states.set(e.bag.target, e.bag.state));
    
    return { durations, states };
  }),
  getClockDuration: (registry, name) => registry.durations.get(name),
  getClockState: (registry, name) => registry.states.get(name)
}));

describe('WodTimer', () => {
  test('should properly handle countdown timer events', () => {
    // Create mock events that simulate a countdown timer
    const events: OutputEvent[] = [
      {
        eventType: 'SET_CLOCK',
        bag: { 
          target: 'primary', 
          duration: { 
            original: 60000, 
            elapsed: 10000, 
            remaining: 50000, 
            sign: '-' 
          } as ISpanDuration 
        },
        timestamp: new Date()
      },
      {
        eventType: 'SET_TIMER_STATE',
        bag: { 
          target: 'primary', 
          state: TimerState.RUNNING_COUNTDOWN
        },
        timestamp: new Date()
      }
    ];

    render(
      <WodTimer events={events}>
        <TestClockDisplay />
      </WodTimer>
    );

    expect(screen.getByTestId('is-running').textContent).toBe('true');
    expect(screen.getByTestId('is-countdown').textContent).toBe('true');
    expect(screen.getByTestId('primary-available').textContent).toBe('true');
  });

  test('should properly handle countup timer events', () => {
    // Create mock events that simulate a countup timer
    const events: OutputEvent[] = [
      {
        eventType: 'SET_CLOCK',
        bag: { 
          target: 'primary', 
          duration: { 
            original: 0, 
            elapsed: 15000, 
            remaining: 0, 
            sign: '+' 
          } as ISpanDuration 
        },
        timestamp: new Date()
      },
      {
        eventType: 'SET_TIMER_STATE',
        bag: { 
          target: 'primary', 
          state: TimerState.RUNNING_COUNTUP
        },
        timestamp: new Date()
      }
    ];

    render(
      <WodTimer events={events}>
        <TestClockDisplay />
      </WodTimer>
    );

    expect(screen.getByTestId('is-running').textContent).toBe('true');
    expect(screen.getByTestId('is-countdown').textContent).toBe('false');
    expect(screen.getByTestId('primary-available').textContent).toBe('true');
  });

  test('should handle stopped timer events', () => {
    // Create mock events that simulate a stopped timer
    const events: OutputEvent[] = [
      {
        eventType: 'SET_CLOCK',
        bag: { 
          target: 'primary', 
          duration: { 
            original: 60000, 
            elapsed: 60000, 
            remaining: 0, 
            sign: '-' 
          } as ISpanDuration 
        },
        timestamp: new Date()
      },
      {
        eventType: 'SET_TIMER_STATE',
        bag: { 
          target: 'primary', 
          state: TimerState.STOPPED
        },
        timestamp: new Date()
      }
    ];

    render(
      <WodTimer events={events}>
        <TestClockDisplay />
      </WodTimer>
    );

    expect(screen.getByTestId('is-running').textContent).toBe('false');
    expect(screen.getByTestId('is-countdown').textContent).toBe('false');
    expect(screen.getByTestId('primary-available').textContent).toBe('true');
  });
});
