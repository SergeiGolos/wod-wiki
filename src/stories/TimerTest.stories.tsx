import type { Meta, StoryObj } from '@storybook/react';
import { expect } from 'storybook/test';
import { userEvent, waitFor, within } from '@storybook/testing-library';
import '../index.css';
import React, { useState } from 'react';
import { WodTimer } from '../components/clock/WodTimer';
import { DefaultClockLayout } from '../components/clock/DefaultClockLayout';
import { ISpanDuration } from '@/core/ISpanDuration';
import { TimerState } from '@/core/runtime/outputs/SetTimerStateAction';
import { OutputEvent } from '@/core/OutputEvent';
import { startButton } from '@/components/buttons/timerButtons';
import EffortSummaryCard from '@/components/metrics/EffortSummaryCard';
import { RuntimeSpan } from '@/core/RuntimeSpan';
import { IDuration } from '@/core/IDuration';

// Helper function to create a valid ISpanDuration
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

// Create a simple 5-second timer test component
const SimpleTimerTest = () => {
  const [events, setEvents] = useState<OutputEvent[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerComplete, setIsTimerComplete] = useState<boolean>(false);
  const [spans, setSpans] = useState<[RuntimeSpan, boolean][]>([]);
  
  // Define the timer duration (5000ms = 5 seconds)
  const timerDuration = createSpanDuration(5000, 0, 5000, '-');

  // Handle run button click
  const handleRunClick = () => {
    // Generate the initial events
    const now = new Date();
    
    // Create a SET_CLOCK event
    const clockEvent: OutputEvent = {
      eventType: 'SET_CLOCK',
      bag: {
        target: 'primary',
        duration: timerDuration
      },
      timestamp: now
    };
    
    // Create a SET_TIMER_STATE event to start the timer
    const stateEvent: OutputEvent = {
      eventType: 'SET_TIMER_STATE',
      bag: {
        target: 'primary',
        state: TimerState.RUNNING_COUNTDOWN
      },
      timestamp: new Date(now.getTime() + 10) // slightly after clock event
    };
    
    // Set the events and mark timer as running
    setEvents([clockEvent, stateEvent]);
    setIsTimerRunning(true);
    
    // Start a timer to update the clock events every second
    let elapsed = 0;
    const intervalId = setInterval(() => {
      elapsed += 1000;
      const remaining = Math.max(0, 5000 - elapsed);
      
      // Update the clock event with a new span duration
      const updateClockEvent: OutputEvent = {
        eventType: 'SET_CLOCK',
        bag: {
          target: 'primary',
          duration: createSpanDuration(5000, elapsed, remaining, '-')
        },
        timestamp: new Date()
      };
      
      // Add the updated clock event
      setEvents(prev => [...prev, updateClockEvent]);
      
      // If we've reached 5 seconds, stop the timer
      if (elapsed >= 5000) {
        clearInterval(intervalId);
        
        const stopEvent: OutputEvent = {
          eventType: 'SET_TIMER_STATE',
          bag: {
            target: 'primary',
            state: TimerState.STOPPED
          },
          timestamp: new Date()
        };
        
        setEvents(prev => [...prev, stopEvent]);
        setIsTimerRunning(false);
        setIsTimerComplete(true);
        
        // Create a span for the completed timer
        const newSpan = new RuntimeSpan();
        newSpan.metrics = [{
          sourceId: "timer-metric",
          effort: "Timer",
          values: []
        }];
        newSpan.timeSpans = [{
          start: { name: 'start', timestamp: now },
          stop: { name: 'stop', timestamp: new Date() }
        }];
        
        setSpans([[newSpan, true]]);
      }
    }, 1000);
    
    // Clean up the interval if component unmounts
    return () => clearInterval(intervalId);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto" data-testid="timer-test-container">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Simple 5-Second Timer Test</h2>
        <p className="text-gray-600 mb-4">
          This is a test component for a 5-second countdown timer. Click the Run button to start the timer.
        </p>
        
        <div className="flex space-x-4 mb-4">
          <button
            data-testid="run-button"
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white focus:outline-none hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRunClick}
            disabled={isTimerRunning || isTimerComplete}
          >
            {startButton.icon && React.createElement(startButton.icon, { className: "w-5 h-5 mr-2" })}
            {startButton.label}
          </button>
          
          {isTimerRunning && (
            <div data-testid="timer-status" className="flex items-center text-blue-600">
              Timer is running
            </div>
          )}
          {isTimerComplete && (
            <div data-testid="timer-status" className="flex items-center text-green-600">
              Timer completed
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-6" data-testid="timer-display">
        <WodTimer events={events}>
          <DefaultClockLayout label="5-Second Timer" />
        </WodTimer>
      </div>
      
      {isTimerComplete && (
        <div data-testid="effort-summary">
          <EffortSummaryCard 
            spansOptions={spans} 
            selectedEffortFilter={[]} 
            setSelectedEffortFilter={() => {}} 
          />
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof SimpleTimerTest> = {
  title: 'Tests/SimpleTimerTest',
  component: SimpleTimerTest,
  parameters: {
    layout: 'centered',
  },
  tags: ['test-case', 'autodocs'],
};

export default meta;
export type SimpleTimerStory = StoryObj<typeof SimpleTimerTest>;

// Export the default story
export const Default: SimpleTimerStory = {};

// Export a story with interaction tests
export const TimerInteractionTest: SimpleTimerStory = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Step 1: Validate the initial state
    await step('Verify initial state', async () => {
      const container = canvas.getByTestId('timer-test-container');
      expect(container).toBeInTheDocument();
      
      const runButton = canvas.getByTestId('run-button');
      expect(runButton).toBeInTheDocument();
      expect(runButton).toBeEnabled();

      const timerDisplay = canvas.getByTestId('timer-display');
      expect(timerDisplay).toBeInTheDocument();

      // Verify effort summary is not visible yet
      const effortSummary = canvas.queryByTestId('effort-summary');
      expect(effortSummary).not.toBeInTheDocument();
    });

    // Step 2: Click the run button
    await step('Click run button to start timer', async () => {
      const runButton = canvas.getByTestId('run-button');
      await userEvent.click(runButton);
      
      // Verify button is now disabled
      expect(runButton).toBeDisabled();
      
      // Verify timer status shows running
      const timerStatus = canvas.getByTestId('timer-status');
      expect(timerStatus).toBeInTheDocument();
      expect(timerStatus.textContent).toContain('running');
    });

    // Step 3: Wait for the timer to complete (5 seconds + buffer)
    await step('Wait for timer to complete', async () => {
      // Wait for the timer to finish (5 seconds + buffer)
      await waitFor(() => {
        const timerStatus = canvas.getByTestId('timer-status');
        expect(timerStatus.textContent).toContain('completed');
      }, { timeout: 6000 });
    });

    // Step 4: Verify the effort summary shows up with sets = 1
    await step('Verify effort summary', async () => {
      const effortSummary = canvas.getByTestId('effort-summary');
      expect(effortSummary).toBeInTheDocument();
      
      // Check for sets = 1 in the effort summary
      const setsElement = within(effortSummary).getByText('Sets');
      const setsValue = setsElement.closest('div')?.querySelector('dd');
      expect(setsValue?.textContent).toBe('1');
    });
  },
};