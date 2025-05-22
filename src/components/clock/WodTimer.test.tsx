import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { WodTimer, WodTimerRef, WodTimerProps } from './WodTimer';
import { Duration } from '@/core/Duration';
import { ISpanDuration } from '@/core/ISpanDuration';
import { IDuration } from '@/core/IDuration';

// Mock ISpanDuration for passive mode testing
const mockSpanDuration = (elapsedMs: number, remainingMs?: number, sign: '+' | '-' = '+'): ISpanDuration => ({
  elapsed: jest.fn(() => new Duration(elapsedMs)),
  remaining: jest.fn(() => (remainingMs !== undefined ? new Duration(remainingMs) : undefined)),
  sign: sign,
  spans: [], // Not used by WodTimer directly for display
  // IDuration parts
  days: new Duration(elapsedMs).days,
  hours: new Duration(elapsedMs).hours,
  minutes: new Duration(elapsedMs).minutes,
  seconds: new Duration(elapsedMs).seconds,
  milliseconds: new Duration(elapsedMs).milliseconds,
  isZero: new Duration(elapsedMs).isZero,
  toMilliseconds: jest.fn(() => elapsedMs),
  toString: jest.fn(() => new Duration(elapsedMs).toString()),
  abs: jest.fn(() => new Duration(Math.abs(elapsedMs))),
  original: elapsedMs,
});


describe('WodTimer', () => {
  let wodTimerRef: React.RefObject<WodTimerRef>;

  beforeEach(() => {
    wodTimerRef = React.createRef<WodTimerRef>();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const renderWodTimer = (props?: Partial<WodTimerProps>) => {
    render(<WodTimer ref={wodTimerRef} {...props} />);
  };

  // Helper to get displayed time (expects format MM:SS.m)
  const getDisplayedTime = ()  => {
    const timeText = screen.getByText(/(\d{2}:\d{2})\.\d/); // Matches "MM:SS.m"
    // Extract MM:SS part for easier comparison in most tests
    const match = timeText.textContent?.match(/(\d{2}:\d{2})/);
    return match ? match[1] : null;
  };
   // Helper to get displayed milliseconds (the digit after dot)
   const getDisplayedMsTenth = (): string | null => {
    const timeText = screen.getByText(/\d{2}:\d{2}\.(\d)/); // Matches "MM:SS.m" and captures "m"
    const match = timeText.textContent?.match(/\.(\d)$/);
    return match ? match[1] : null;
  };


  test('should initialize to 00:00.0 when no props are given', () => {
    renderWodTimer();
    expect(getDisplayedTime()).toBe('00:00');
    expect(getDisplayedMsTenth()).toBe('0');
  });

  describe('Active Mode - Count Up', () => {
    test('start() should count up from 00:00.0', () => {
      renderWodTimer();
      act(() => {
        wodTimerRef.current?.start();
      });
      expect(getDisplayedTime()).toBe('00:00');
      expect(getDisplayedMsTenth()).toBe('0');

      act(() => {
        jest.advanceTimersByTime(1000); // 1 second
      });
      expect(getDisplayedTime()).toBe('00:01');
      expect(getDisplayedMsTenth()).toBe('0');

      act(() => {
        jest.advanceTimersByTime(500); // 0.5 seconds
      });
      expect(getDisplayedTime()).toBe('00:01');
      expect(getDisplayedMsTenth()).toBe('5');
    });

    test('start(startTimeInSeconds) should count up from specified time', () => {
      renderWodTimer();
      act(() => {
        wodTimerRef.current?.start(5); // Start at 00:05.0
      });
      expect(getDisplayedTime()).toBe('00:05');
      expect(getDisplayedMsTenth()).toBe('0');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:06');
      expect(getDisplayedMsTenth()).toBe('0');
    });

    test('stop() should freeze the timer', () => {
      renderWodTimer();
      act(() => {
        wodTimerRef.current?.start();
        jest.advanceTimersByTime(1200); // 00:01.2
      });
      expect(getDisplayedTime()).toBe('00:01');
      expect(getDisplayedMsTenth()).toBe('2');

      act(() => {
        wodTimerRef.current?.stop();
        jest.advanceTimersByTime(1000); // Try to advance time
      });
      // Time should remain frozen
      expect(getDisplayedTime()).toBe('00:01');
      expect(getDisplayedMsTenth()).toBe('2');
    });

    test('reset() should reset to 00:00.0 and stop', () => {
      renderWodTimer();
      act(() => {
        wodTimerRef.current?.start();
        jest.advanceTimersByTime(1500); // 00:01.5
      });
      expect(getDisplayedTime()).toBe('00:01');
      expect(getDisplayedMsTenth()).toBe('5');

      act(() => {
        wodTimerRef.current?.reset();
      });
      expect(getDisplayedTime()).toBe('00:00');
      expect(getDisplayedMsTenth()).toBe('0');

      // Ensure it's stopped
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:00');
      expect(getDisplayedMsTenth()).toBe('0');
    });
  });

  describe('Active Mode - Count Down', () => {
    test('start() with countdownFrom prop should count down', () => {
      renderWodTimer({ countdownFrom: 3 }); // 3 seconds
      act(() => {
        wodTimerRef.current?.start();
      });
      expect(getDisplayedTime()).toBe('00:03'); // Initial display
      expect(getDisplayedMsTenth()).toBe('0');

      act(() => {
        jest.advanceTimersByTime(1000); // 1 second
      });
      expect(getDisplayedTime()).toBe('00:02');
      expect(getDisplayedMsTenth()).toBe('0');

      act(() => {
        jest.advanceTimersByTime(1900); // 1.9 seconds (total 2.9s)
      });
      expect(getDisplayedTime()).toBe('00:00'); // Should be 00:00.1
      expect(getDisplayedMsTenth()).toBe('1');
      
      act(() => {
        jest.advanceTimersByTime(100); // total 3s, reaches 0
      });
      expect(getDisplayedTime()).toBe('00:00');
      expect(getDisplayedMsTenth()).toBe('0');
       // Timer should stop at 0
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:00');
      expect(getDisplayedMsTenth()).toBe('0');
    });

    test('start(startTimeInSeconds) with countdownFrom prop should ignore startTime and use countdownFrom', () => {
      renderWodTimer({ countdownFrom: 3 });
      act(() => {
        wodTimerRef.current?.start(10); // This startTime should be ignored for countdown
      });
      expect(getDisplayedTime()).toBe('00:03');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:02');
    });

    test('reset() with countdownFrom prop should reset to countdownFrom value and stop', () => {
      renderWodTimer({ countdownFrom: 5 });
      act(() => {
        wodTimerRef.current?.start();
        jest.advanceTimersByTime(2000); // Counts down to 00:03.0
      });
      expect(getDisplayedTime()).toBe('00:03');

      act(() => {
        wodTimerRef.current?.reset();
      });
      expect(getDisplayedTime()).toBe('00:05'); // Resets to initial countdown value
      expect(getDisplayedMsTenth()).toBe('0');

      // Ensure it's stopped
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:05');
    });
  });

  describe('Passive Mode (prop-driven)', () => {
    test('should display time from `primary` prop when not running', () => {
      const initialPrimary = mockSpanDuration(123000); // 02:03.0
      renderWodTimer({ primary: initialPrimary });
      expect(getDisplayedTime()).toBe('02:03');
      expect(getDisplayedMsTenth()).toBe('0');

      // Simulate prop update (e.g. parent re-renders with new prop)
      act(() => {
        // This requires re-rendering with new props or ensuring the mock's methods are called by the interval in WodTimer
        // For simplicity here, we'll assume the interval within WodTimer calls elapsed() again.
        // If WodTimer's internal passive interval is running:
        initialPrimary.elapsed.mockReturnValue(new Duration(124000)); // 02:04.0
        jest.advanceTimersByTime(100); // Trigger WodTimer's internal passive update
      });
       expect(getDisplayedTime()).toBe('02:04');
       expect(getDisplayedMsTenth()).toBe('0');
    });

    test('should switch from passive to active mode and back', () => {
      const initialPrimary = mockSpanDuration(60000); // 01:00.0
      renderWodTimer({ primary: initialPrimary });
      expect(getDisplayedTime()).toBe('01:00'); // Passive

      // Start active timer
      act(() => {
        wodTimerRef.current?.start(0); // Start from 00:00.0
        jest.advanceTimersByTime(1000);
      });
      expect(getDisplayedTime()).toBe('00:01'); // Active

      // Stop active timer - should remain on active time
      act(() => {
        wodTimerRef.current?.stop();
        jest.advanceTimersByTime(1000); // Should not advance
      });
      expect(getDisplayedTime()).toBe('00:01');

      // Reset - should reset active timer and remain stopped (showing active timer's reset state)
      act(() => {
        wodTimerRef.current?.reset();
      });
      expect(getDisplayedTime()).toBe('00:00');

      // If we were to re-enable passive mode, it might involve removing the `isRunning` flag
      // and letting the prop-driven useEffect take over. The current design has `isRunning`
      // only set to false on stop/reset. If `primary` prop changes while stopped,
      // the passive useEffect should update `propPrimaryDisplay`.
      // This test case focuses on the switch to active and its controls.
    });
  });
});
