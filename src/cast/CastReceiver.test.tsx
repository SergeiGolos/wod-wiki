import React from 'react';
import { render, screen } from '@testing-library/react';
import { Subject } from 'rxjs';
import { CastReceiver } from './CastReceiver';
import { OutputEvent } from '@/core/OutputEvent';
import { OutputEventType } from '@/core/OutputEventType';
import { StartClockPayload } from './types/chromecast-events';

// Mock WodTimer and WodTimerRef
const mockWodTimerRef = {
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@/components/clock/WodTimer', () => ({
  WodTimer: jest.fn().mockImplementation(React.forwardRef((props, ref) => {
    if (ref) {
      (ref as React.MutableRefObject<typeof mockWodTimerRef>).current = mockWodTimerRef;
    }
    // Render a placeholder or null, as WodTimer's internals are not tested here
    return <div data-testid="mock-wod-timer">Mock WodTimer Display: {JSON.stringify(props.display)}</div>;
  })),
}));

describe('CastReceiver', () => {
  let event$: Subject<OutputEvent>;

  beforeEach(() => {
    event$ = new Subject<OutputEvent>();
    mockWodTimerRef.start.mockClear();
    mockWodTimerRef.stop.mockClear();
    mockWodTimerRef.reset.mockClear();
  });

  it('should call WodTimerRef.start when START_CLOCK event is received', () => {
    render(<CastReceiver event$={event$} className="test-class" />);
    
    const payload: StartClockPayload = { startTime: 300 }; // 5 minutes
    const startEvent: OutputEvent = {
      eventType: 'START_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: payload,
    };
    event$.next(startEvent);

    expect(mockWodTimerRef.start).toHaveBeenCalledTimes(1);
    expect(mockWodTimerRef.start).toHaveBeenCalledWith(payload.startTime);
  });

  it('should call WodTimerRef.start with undefined if no startTime in payload for START_CLOCK', () => {
    render(<CastReceiver event$={event$} />);
    
    const startEvent: OutputEvent = {
      eventType: 'START_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {}, // No startTime
    };
    event$.next(startEvent);

    expect(mockWodTimerRef.start).toHaveBeenCalledTimes(1);
    expect(mockWodTimerRef.start).toHaveBeenCalledWith(undefined);
  });

  it('should call WodTimerRef.stop when STOP_CLOCK event is received', () => {
    render(<CastReceiver event$={event$} />);
    
    const stopEvent: OutputEvent = {
      eventType: 'STOP_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    event$.next(stopEvent);

    expect(mockWodTimerRef.stop).toHaveBeenCalledTimes(1);
  });

  it('should call WodTimerRef.reset when RESET_CLOCK event is received', () => {
    render(<CastReceiver event$={event$} />);
    
    const resetEvent: OutputEvent = {
      eventType: 'RESET_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    event$.next(resetEvent);

    expect(mockWodTimerRef.reset).toHaveBeenCalledTimes(1);
  });

  it('should update debug messages when events are received', () => {
    render(<CastReceiver event$={event$} />);
    
    const payload: StartClockPayload = { startTime: 10 };
    const startEvent: OutputEvent = {
      eventType: 'START_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: payload,
    };
    event$.next(startEvent);

    // Check if the debug message for START_CLOCK is rendered
    // This relies on the internal implementation detail of how messages are shown,
    // which is okay for testing the component's own output.
    expect(screen.getByText(/Start clock at 10/i)).toBeInTheDocument();

    const stopEvent: OutputEvent = {
      eventType: 'STOP_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    event$.next(stopEvent);
    expect(screen.getByText(/Stop clock/i)).toBeInTheDocument();
    
    const resetEvent: OutputEvent = {
      eventType: 'RESET_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    event$.next(resetEvent);
    expect(screen.getByText(/Reset clock/i)).toBeInTheDocument();
  });

  it('should handle SET_DISPLAY events for completeness', () => {
    render(<CastReceiver event$={event$} />);
    const displayPayload = {
      spans: [{ hours: 0, minutes: 1, seconds: 30, milliseconds: 0 }],
      totalTime: { hours: 0, minutes: 10, seconds: 0, milliseconds: 0 },
    };
    const setDisplayEvent: OutputEvent = {
      eventType: 'SET_DISPLAY' as OutputEventType,
      timestamp: new Date(),
      bag: displayPayload,
    };
    event$.next(setDisplayEvent);
    // We are mocking WodTimer, so we can check the props passed to it.
    // The mock WodTimer renders props.display as JSON string.
    expect(screen.getByTestId('mock-wod-timer')).toHaveTextContent(
      JSON.stringify({
        primary: displayPayload.spans[0],
        label: 'Timer', // Default label in CastReceiver
        bag: { totalTime: displayPayload.totalTime },
      })
    );
  });

});
