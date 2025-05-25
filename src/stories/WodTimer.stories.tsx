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
import { startButton, pauseButton, resetButton } from '@/components/buttons/timerButtons';
import { IDuration } from '@/core/IDuration';

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

/**
 * WodTimer component wrapper for a 5-second timer
 * 
 * This story demonstrates how to test the WodTimer with a simple ":05 Work" script.
 * It includes controls for starting, pausing, and resetting the timer, and displays
 * the current state (running, paused, or completed).
 */
const FiveSecondTimer = () => {
  const [events, setEvents] = useState<OutputEvent[]>([]);
  const [timerState, setTimerState] = useState<'ready' | 'running' | 'paused' | 'completed'>('ready');
  const [timeRemaining, setTimeRemaining] = useState<number>(5000); // 5 seconds
  
  // Effect to update the clock events when state changes
  useEffect(() => {
    if (timerState === 'ready') {
      // Initial setup - 5 second timer
      const setupEvents: OutputEvent[] = [
        {
          eventType: 'SET_CLOCK',
          bag: {
            target: 'primary',
            duration: createSpanDuration(5000, 0, 5000, '-'),
            effort: 'Work' // Add effort label
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
      setTimeRemaining(5000);
    }
  }, [timerState]);

  // Start the timer
  const handleStart = () => {
    if (timerState !== 'ready' && timerState !== 'paused') return;
    
    const now = new Date();
    const stateEvent: OutputEvent = {
      eventType: 'SET_TIMER_STATE',
      bag: {
        target: 'primary',
        state: TimerState.RUNNING_COUNTDOWN
      },
      timestamp: now
    };
    
    setEvents(prev => [...prev, stateEvent]);
    setTimerState('running');
    
    // Update the timer every second
    const intervalId = setInterval(() => {
      setTimeRemaining(prev => {
        const newRemaining = Math.max(0, prev - 1000);
        const elapsed = 5000 - newRemaining;
        
        // Update the clock event
        const updateEvent: OutputEvent = {
          eventType: 'SET_CLOCK',
          bag: {
            target: 'primary',
            duration: createSpanDuration(5000, elapsed, newRemaining, '-'),
            effort: 'Work'
          },
          timestamp: new Date()
        };
        
        setEvents(e => [...e, updateEvent]);
        
        // If timer completes
        if (newRemaining <= 0) {
          clearInterval(intervalId);
          
          const completeEvent: OutputEvent = {
            eventType: 'SET_TIMER_STATE',
            bag: {
              target: 'primary',
              state: TimerState.STOPPED
            },
            timestamp: new Date()
          };
          
          setEvents(e => [...e, completeEvent]);
          setTimerState('completed');
        }
        
        return newRemaining;
      });
    }, 1000);
    
    // Cleanup
    return () => clearInterval(intervalId);
  };

  // Pause the timer
  const handlePause = () => {
    if (timerState !== 'running') return;
    
    const pauseEvent: OutputEvent = {
      eventType: 'SET_TIMER_STATE',
      bag: {
        target: 'primary',
        state: TimerState.PAUSED
      },
      timestamp: new Date()
    };
    
    setEvents(prev => [...prev, pauseEvent]);
    setTimerState('paused');
  };

  // Reset the timer
  const handleReset = () => {
    if (timerState === 'ready') return;
    
    setTimerState('ready');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto" data-testid="wod-timer-container">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5-Second Work Timer</h2>
        <p className="text-gray-600 mb-4">
          This timer simulates a ":05 Work" script. Use the controls below to manage the timer.
        </p>
        
        <div className="flex space-x-4 mb-4">
          <button
            data-testid="start-button"
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white focus:outline-none hover:bg-blue-700 disabled:opacity-50"
            onClick={handleStart}
            disabled={timerState === 'running' || timerState === 'completed'}
          >
            {startButton.icon && React.createElement(startButton.icon, { className: "w-5 h-5 mr-2" })}
            {startButton.label}
          </button>
          
          <button
            data-testid="pause-button"
            className="flex items-center px-4 py-2 rounded-md bg-yellow-600 text-white focus:outline-none hover:bg-yellow-700 disabled:opacity-50"
            onClick={handlePause}
            disabled={timerState !== 'running'}
          >
            {pauseButton.icon && React.createElement(pauseButton.icon, { className: "w-5 h-5 mr-2" })}
            {pauseButton.label}
          </button>
          
          <button
            data-testid="reset-button"
            className="flex items-center px-4 py-2 rounded-md bg-gray-600 text-white focus:outline-none hover:bg-gray-700 disabled:opacity-50"
            onClick={handleReset}
            disabled={timerState === 'ready'}
          >
            {resetButton.icon && React.createElement(resetButton.icon, { className: "w-5 h-5 mr-2" })}
            {resetButton.label}
          </button>
          
          <div data-testid="timer-status" className="flex items-center ml-4">
            {timerState === 'running' && <span className="text-blue-600">Timer is running</span>}
            {timerState === 'paused' && <span className="text-yellow-600">Timer is paused</span>}
            {timerState === 'completed' && <span className="text-green-600">Timer completed</span>}
            {timerState === 'ready' && <span className="text-gray-600">Timer ready</span>}
          </div>
        </div>
      </div>
      
      <div className="mb-6" data-testid="timer-display">
        <WodTimer events={events}>
          <DefaultClockLayout label="Work" />
        </WodTimer>
      </div>
    </div>
  );
};

const meta: Meta<typeof FiveSecondTimer> = {
  title: 'WodTimer/FiveSecondTimer',
  component: FiveSecondTimer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A testable implementation of WodTimer for a 5-second work timer (:05 Work).'
      }
    }
  },
  tags: ['autodocs'],
};

export default meta;
export type FiveSecondTimerStory = StoryObj<typeof FiveSecondTimer>;

// Default story
export const Default: FiveSecondTimerStory = {};

// Interactive test story
export const InteractionTest: FiveSecondTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    
    // Step 1: Verify initial state
    await step('Verify initial state', async () => {
      const container = canvas.getByTestId('wod-timer-container');
      expect(container).toBeInTheDocument();
      
      const startButton = canvas.getByTestId('start-button');
      expect(startButton).toBeInTheDocument();
      expect(startButton).toBeEnabled();
      
      const pauseButton = canvas.getByTestId('pause-button');
      expect(pauseButton).toBeDisabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeDisabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Timer ready');
    });
    
    // Step 2: Start the timer
    await step('Start the timer', async () => {
      const startButton = canvas.getByTestId('start-button');
      await userEvent.click(startButton);
      
      // Verify button states after starting
      expect(startButton).toBeDisabled();
      
      const pauseButton = canvas.getByTestId('pause-button');
      expect(pauseButton).toBeEnabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeEnabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Timer is running');
    });
    
    // Step 3: Pause the timer
    await step('Pause the timer', async () => {
      const pauseButton = canvas.getByTestId('pause-button');
      await userEvent.click(pauseButton);
      
      // Verify button states after pausing
      const startButton = canvas.getByTestId('start-button');
      expect(startButton).toBeEnabled();
      expect(pauseButton).toBeDisabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Timer is paused');
    });
    
    // Step 4: Resume the timer
    await step('Resume the timer', async () => {
      const startButton = canvas.getByTestId('start-button');
      await userEvent.click(startButton);
      
      expect(startButton).toBeDisabled();
      
      const pauseButton = canvas.getByTestId('pause-button');
      expect(pauseButton).toBeEnabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Timer is running');
    });
    
    // Step 5: Wait for the timer to complete
    await step('Wait for timer to complete', async () => {
      // Wait for the timer to finish (should be at most 5 seconds, but allow buffer)
      await waitFor(() => {
        const timerStatus = canvas.getByTestId('timer-status');
        expect(timerStatus.textContent).toContain('Timer completed');
      }, { timeout: 6000 });
      
      // Verify button states after completion
      const startButton = canvas.getByTestId('start-button');
      expect(startButton).toBeDisabled();
      
      const pauseButton = canvas.getByTestId('pause-button');
      expect(pauseButton).toBeDisabled();
      
      const resetButton = canvas.getByTestId('reset-button');
      expect(resetButton).toBeEnabled();
    });
    
    // Step 6: Reset the timer
    await step('Reset the timer', async () => {
      const resetButton = canvas.getByTestId('reset-button');
      await userEvent.click(resetButton);
      
      // Verify we're back to initial state
      const startButton = canvas.getByTestId('start-button');
      expect(startButton).toBeEnabled();
      
      const pauseButton = canvas.getByTestId('pause-button');
      expect(pauseButton).toBeDisabled();
      
      expect(resetButton).toBeDisabled();
      
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus.textContent).toContain('Timer ready');
    });
  },
};