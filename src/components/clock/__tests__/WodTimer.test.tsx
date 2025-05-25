import { render, screen } from '@testing-library/react';
import { WodTimer } from '../WodTimer';
import { OutputEvent } from '@/core/OutputEvent';
import { TimerState } from '@/core/runtime/outputs/SetTimerStateAction';
import { ISpanDuration } from '@/core/ISpanDuration';
import React from 'react';
import { vi, describe, test, expect } from 'vitest';

// Mock ClockContext since we can't directly import it
import { createContext } from 'react';

// Create a mock ClockContext
const ClockContext = createContext({
  registry: {
    durations: new Map<string, ISpanDuration>(),
    states: new Map<string, TimerState>(),
    efforts: new Map<string, string>()
  },
  isRunning: false,
  isCountdown: false
});

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

// Test component that inspects the effort
const TestEffortDisplay = () => {
  const clockContext = React.useContext(ClockContext);
  return (
    <div>
      <div data-testid="primary-effort">
        {clockContext.registry.efforts.get('primary') || 'none'}
      </div>
    </div>
  );
};

// Create a mock implementation of the hooks
vi.mock('@/hooks', () => {
  return {
    useClockRegistry: (events: OutputEvent[]) => {
      const durations = new Map<string, ISpanDuration>();
      const states = new Map<string, TimerState>();
      const efforts = new Map<string, string>();

      // Process the events
      for (const event of events) {
        if (event.eventType === 'SET_CLOCK' && event.bag?.target && event.bag?.duration) {
          durations.set(event.bag.target, event.bag.duration);
        }
        else if (event.eventType === 'SET_TIMER_STATE' && event.bag?.target && event.bag?.state) {
          states.set(event.bag.target, event.bag.state);
        }
        else if (event.eventType === 'SET_EFFORT' && event.bag?.target && event.bag?.effort) {
          efforts.set(event.bag.target, event.bag.effort);
        }
      }

      return { durations, states, efforts };
    },
    getClockState: (clockRegistry: any, name: string) => {
      return clockRegistry.states.get(name);
    }
  };
});

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
  
  test('should handle effort events', () => {
    // Create mock events that include an effort
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
        eventType: 'SET_EFFORT',
        bag: { 
          target: 'primary',
          effort: 'Work'
        },
        timestamp: new Date()
      }
    ];

    render(
      <WodTimer events={events}>
        <TestEffortDisplay />
      </WodTimer>
    );

    expect(screen.getByTestId('primary-effort').textContent).toBe('Work');
  });
});