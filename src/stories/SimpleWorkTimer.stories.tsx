import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/test';
import { userEvent, waitFor, within } from '@storybook/testing-library';
import '../index.css';
import React, { useEffect, useState } from 'react';
import { WodTimer } from '../components/clock/WodTimer';
import { DefaultClockLayout } from '../components/clock/DefaultClockLayout';
import { ISpanDuration } from '@/core/ISpanDuration';
import { TimerState } from '@/core/runtime/outputs/SetTimerStateAction';
import { OutputEvent } from '@/core/OutputEvent';
import { IDuration } from '@/core/IDuration';

/**
 * SimpleWorkTimer Story
 * 
 * This story demonstrates a simple ":05 Work" timer using the WodTimer component.
 */

/**
 * Helper function to create a valid ISpanDuration
 */
const createSpanDuration = (original: number, elapsed: number, remaining: number, sign: '-' | '+'): ISpanDuration => {
  return {
    days: 0,
    hours: 0,
    minutes: Math.floor(elapsed / 60000),
    seconds: Math.floor((elapsed % 60000) / 1000),
    milliseconds: elapsed % 1000,
    original,
    spans: [],
    sign,
    elapsed(): IDuration {
      return {
        days: 0,
        hours: 0,
        minutes: Math.floor(elapsed / 60000),
        seconds: Math.floor((elapsed % 60000) / 1000),
        milliseconds: elapsed % 1000
      };
    },
    remaining(): IDuration {
      return {
        days: 0,
        hours: 0,
        minutes: Math.floor(remaining / 60000),
        seconds: Math.floor((remaining % 60000) / 1000),
        milliseconds: remaining % 1000
      };
    }
  };
};

const SimpleWorkTimer = () => {
  const [events, setEvents] = useState<OutputEvent[]>([]);
  const [timerState, setTimerState] = useState<'ready' | 'running' | 'paused' | 'completed'>('ready');
  const [timeRemaining, setTimeRemaining] = useState<number>(5000); // 5 seconds
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  // Initialize a 5-second timer
  useEffect(() => {
    // Initial setup - set the clock to 5 seconds
    const setupEvents: OutputEvent[] = [
      {
        eventType: 'SET_CLOCK',
        bag: {
          target: 'primary',
          duration: createSpanDuration(5000, 0, 5000, '-'),
          effort: 'Work'
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
    setEvents(setupEvents);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);
  
  const startTimer = () => {
    if (timerState === 'running') return;
    
    setTimerState('running');
    
    // Add event to set timer state to running
    const runEvent: OutputEvent = {
      eventType: 'SET_TIMER_STATE',
      bag: {
        target: 'primary',
        state: TimerState.RUNNING_COUNTDOWN
      },
      timestamp: new Date()
    };
    
    setEvents(prev => [...prev, runEvent]);
    
    // Start the countdown
    let remaining = timeRemaining;
    intervalId = setInterval(() => {
      remaining -= 1000;
      setTimeRemaining(remaining);
      
      // Update the clock
      const clockEvent: OutputEvent = {
        eventType: 'SET_CLOCK',
        bag: {
          target: 'primary',
          duration: createSpanDuration(5000, 5000 - remaining, remaining, '-'),
          effort: 'Work'
        },
        timestamp: new Date()
      };
      
      setEvents(prev => [...prev, clockEvent]);
      
      if (remaining <= 0) {
        if (intervalId) {
          clearInterval(intervalId);
        }
        
        // Timer complete
        const completeEvent: OutputEvent = {
          eventType: 'SET_TIMER_STATE',
          bag: {
            target: 'primary',
            state: TimerState.STOPPED
          },
          timestamp: new Date()
        };
        
        setEvents(prev => [...prev, completeEvent]);
        setTimerState('completed');
      }
    }, 1000);
  };
  
  const resetTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    setTimerState('ready');
    setTimeRemaining(5000);
    
    // Reset events
    const resetEvents: OutputEvent[] = [
      {
        eventType: 'SET_CLOCK',
        bag: {
          target: 'primary',
          duration: createSpanDuration(5000, 0, 5000, '-'),
          effort: 'Work'
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
    
    setEvents(resetEvents);
  };
  
  return (
    <div className="p-4 max-w-md mx-auto" data-testid="simple-timer-container">
      <h2 className="text-xl font-semibold mb-2">:05 Work Timer</h2>
      <p className="text-gray-600 mb-2">A simple 5-second work timer.</p>
      
      <div className="mb-4" data-testid="timer-display">
        <WodTimer events={events}>
          <DefaultClockLayout label="Work" />
        </WodTimer>
      </div>
      
      <div className="flex space-x-4">
        <button
          data-testid="run-button"
          className={`px-4 py-2 rounded ${
            timerState === 'running' || timerState === 'completed' 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
          onClick={startTimer}
          disabled={timerState === 'running' || timerState === 'completed'}
        >
          Start
        </button>
        
        <button
          data-testid="reset-button"
          className={`px-4 py-2 rounded ${
            timerState === 'ready'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700'
          } text-white`}
          onClick={resetTimer}
          disabled={timerState === 'ready'}
        >
          Reset
        </button>
        
        <div data-testid="timer-status" className="flex items-center ml-4">
          {timerState === 'running' && <span className="text-blue-600">Running</span>}
          {timerState === 'completed' && <span className="text-green-600">Completed</span>}
          {timerState === 'ready' && <span className="text-gray-600">Ready</span>}
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof SimpleWorkTimer> = {
  title: 'Examples/SimpleWorkTimer',
  component: SimpleWorkTimer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A simple implementation of ":05 Work" timer using the WodTimer component.'
      }
    }
  },
  tags: ['autodocs'],
};

export default meta;
export type SimpleWorkTimerStory = StoryObj<typeof SimpleWorkTimer>;

// Default story
export const Default: SimpleWorkTimerStory = {};

// Interactive test story
export const TimerTest: SimpleWorkTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    
    // Step 1: Verify initial state
    await step('Verify initial state', async () => {
      const container = canvas.getByTestId('simple-timer-container');
      expect(container).toBeInTheDocument();
      
      const runButton = canvas.getByTestId('run-button');
      expect(runButton).toBeInTheDocument();
      expect(runButton).toBeEnabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toBeDisabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Ready');
    });
    
    // Step 2: Start the timer
    await step('Start the timer', async () => {
      const runButton = canvas.getByTestId('run-button');
      await userEvent.click(runButton);
      
      // Verify button states after starting
      expect(runButton).toBeDisabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeEnabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Running');
    });
    
    // Step 3: Wait for the timer to complete
    await step('Wait for timer to complete', async () => {
      // Wait for the timer to finish (5 seconds)
      await waitFor(() => {
        const timerStatus = canvas.getByTestId('timer-status');
        expect(timerStatus.textContent).toContain('Completed');
      }, { timeout: 6000 });
      
      // Verify button states after completion
      const runButton = canvas.getByTestId('run-button');
      expect(runButton).toBeDisabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeEnabled();
    });
    
    // Step 4: Reset the timer
    await step('Reset the timer', async () => {
      const resetButton = canvas.getByTestId('reset-button');
      await userEvent.click(resetButton);
      
      // Verify we're back to initial state
      const runButton = canvas.getByTestId('run-button');
      expect(runButton).toBeEnabled();
      expect(resetButton).toBeDisabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Ready');
    });
  },
};