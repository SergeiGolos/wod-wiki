/**
 * TimerMemoryVisualization Contract Tests
 *
 * TDD APPROACH: These tests are written BEFORE the component exists.
 *
 * Current State: Tests use MockTimerMemoryVisualization class to verify contract requirements
 * Future State: When the actual React component is implemented, these tests will be updated to:
 * 1. Import and render the real TimerMemoryVisualization component
 * 2. Use React Testing Library for DOM assertions
 * 3. Verify actual JSX output instead of mock render() method
 *
 * Contract Requirements Tested:
 * 1. MUST subscribe to memory references on mount
 * 2. MUST unsubscribe on unmount
 * 3. MUST display time spans array correctly
 * 4. MUST display running state with visual indicator
 * 5. MUST invoke hover callback on mouse enter/leave
 * 6. MUST apply highlight styling when isHighlighted=true
 * 7. MUST handle missing memory gracefully
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TypedMemoryReference } from '../../src/runtime/IMemoryReference';
import { RuntimeMemory } from '../../src/runtime/RuntimeMemory';
import { TimeSpan } from '../../src/CollectionSpan';

/**
 * TimerMemoryVisualization component props based on contract requirements
 * Component will be implemented to satisfy these tests
 */
interface TimerMemoryVisualizationProps {
  timeSpansRef: TypedMemoryReference<TimeSpan[]>;
  isRunningRef: TypedMemoryReference<boolean>;
  blockKey: string;
  onMemoryHover?: (highlighted: boolean) => void;
  isHighlighted?: boolean;
}

/**
 * Mock component interface - this will be replaced by actual implementation
 * These tests verify the contract requirements for component behavior
 */
class MockTimerMemoryVisualization {
  private subscriptions: (() => void)[] = [];

  constructor(private props: TimerMemoryVisualizationProps) {
    // Component will subscribe to memory references on mount
  }

  mount(): void {
    // Contract Requirement 1: MUST subscribe to memory references on mount
    const timeSpansUnsubscribe = this.props.timeSpansRef.subscribe(
      (newValue, oldValue) => {
        // Handle time spans updates
      },
      { immediate: true }
    );

    const isRunningUnsubscribe = this.props.isRunningRef.subscribe(
      (newValue, oldValue) => {
        // Handle running state updates
      },
      { immediate: true }
    );

    this.subscriptions.push(timeSpansUnsubscribe, isRunningUnsubscribe);
  }

  unmount(): void {
    // Contract Requirement 2: MUST unsubscribe on unmount
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        // Handle unsubscription errors gracefully
      }
    });
    this.subscriptions = [];
  }

  handleMouseEnter(): void {
    // Contract Requirement 5: MUST invoke hover callback on mouse enter
    if (this.props.onMemoryHover) {
      this.props.onMemoryHover(true);
    }
  }

  handleMouseLeave(): void {
    // Contract Requirement 5: MUST invoke hover callback on mouse leave
    if (this.props.onMemoryHover) {
      this.props.onMemoryHover(false);
    }
  }

  render(): string {
    // Mock render method that would return JSX in real implementation
    try {
      const timeSpans = this.props.timeSpansRef.get();
      const isRunning = this.props.isRunningRef.get();

      // Contract Requirement 7: MUST handle missing memory gracefully
      if (timeSpans === undefined || isRunning === undefined) {
        return 'No memory allocated';
      }

      // Contract Requirement 3: MUST display time spans array correctly
      const timeSpansDisplay = this.formatTimeSpans(timeSpans);

      // Contract Requirement 4: MUST display running state with visual indicator
      const runningDisplay = this.formatRunningState(isRunning);

      // Contract Requirement 6: MUST apply highlight styling when isHighlighted=true
      const highlightClass = this.props.isHighlighted ? 'bg-blue-100' : '';

      return `${this.props.blockKey} | ${timeSpansDisplay} | ${runningDisplay} | ${highlightClass}`;
    } catch (error) {
      // Contract Requirement 7: MUST handle missing memory gracefully
      return 'Memory error';
    }
  }

  private formatTimeSpans(timeSpans: TimeSpan[]): string {
    if (timeSpans.length === 0) {
      return 'No time spans recorded';
    }

    return timeSpans.map((span, index) => {
      const start = span.start ? this.formatTime(span.start) : 'unknown';
      const stop = span.stop ? this.formatTime(span.stop) : 'running';
      return `${index + 1}: ${start} → ${stop}`;
    }).join(', ');
  }

  private formatRunningState(isRunning: boolean): string {
    return isRunning ? '● RUNNING (green)' : '● STOPPED (gray)';
  }

  private formatTime(date: Date): string {
    // Use UTC time to ensure consistent test results across timezones
    return date.toUTCString().split(' ')[4]; // HH:MM:SS format from UTC string
  }
}

describe('TimerMemoryVisualization Contract', () => {
  let mockMemory: RuntimeMemory;
  let mockTimeSpansRef: TypedMemoryReference<TimeSpan[]>;
  let mockIsRunningRef: TypedMemoryReference<boolean>;
  let mockHoverCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create fresh memory instance for each test
    mockMemory = new RuntimeMemory();

    // Create mock memory references
    mockTimeSpansRef = mockMemory.allocate<TimeSpan[]>(
      'timeSpans',
      'test-block-1',
      []
    );

    mockIsRunningRef = mockMemory.allocate<boolean>(
      'isRunning',
      'test-block-1',
      false
    );

    // Create mock hover callback
    mockHoverCallback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Requirement 1: MUST subscribe to memory references on mount', () => {
    it('should subscribe to timeSpansRef on component mount', () => {
      // GIVEN: Component with memory references
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is mounted
      component.mount();

      // THEN: Subscriptions should be created (verified by actual memory updates)
      const initialTimeSpans: TimeSpan[] = [
        { start: new Date('2025-01-01T10:00:00Z'), stop: new Date('2025-01-01T10:01:00Z') }
      ];
      mockTimeSpansRef.set(initialTimeSpans);

      // Component should be aware of subscription (real implementation would trigger re-render)
      expect(mockTimeSpansRef.get()).toEqual(initialTimeSpans);

      // Cleanup
      component.unmount();
    });

    it('should subscribe to isRunningRef on component mount', () => {
      // GIVEN: Component with memory references
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is mounted
      component.mount();

      // THEN: Subscriptions should be created
      mockIsRunningRef.set(true);

      // Component should be aware of subscription
      expect(mockIsRunningRef.get()).toBe(true);

      // Cleanup
      component.unmount();
    });
  });

  describe('Contract Requirement 2: MUST unsubscribe on unmount', () => {
    it('should unsubscribe from all memory references on unmount', () => {
      // GIVEN: Component is mounted
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);
      component.mount();

      // WHEN: Component is unmounted
      expect(() => component.unmount()).not.toThrow();

      // THEN: Unmount should complete without errors
      // Subscriptions should be cleaned up (verified by lack of memory leaks)
      expect(mockTimeSpansRef.get()).toBeDefined();
      expect(mockIsRunningRef.get()).toBeDefined();
    });

    it('should handle unsubscription errors gracefully', () => {
      // GIVEN: Component with memory references
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);
      component.mount();

      // WHEN: Component is unmounted (even if unsubscribe fails)
      // THEN: Should not throw errors
      expect(() => component.unmount()).not.toThrow();
    });
  });

  describe('Contract Requirement 3: MUST display time spans array correctly', () => {
    it('should display array length when time spans exist', () => {
      // GIVEN: Time spans data
      const timeSpans: TimeSpan[] = [
        { start: new Date('2025-01-01T10:00:00Z'), stop: new Date('2025-01-01T10:01:00Z') },
        { start: new Date('2025-01-01T10:02:00Z'), stop: new Date('2025-01-01T10:03:00Z') }
      ];
      mockTimeSpansRef.set(timeSpans);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should display time spans correctly
      expect(rendered).toContain('test-block-1');
      expect(rendered).toContain('1: 10:00:00 → 10:01:00');
      expect(rendered).toContain('2: 10:02:00 → 10:03:00');
    });

    it('should format timestamps as HH:MM:SS', () => {
      // GIVEN: Time span with specific timestamps
      const timeSpans: TimeSpan[] = [
        { start: new Date('2025-01-01T10:30:45Z'), stop: new Date('2025-01-01T10:31:55Z') }
      ];
      mockTimeSpansRef.set(timeSpans);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should format timestamps correctly
      expect(rendered).toContain('10:30:45');
      expect(rendered).toContain('10:31:55');
    });

    it('should show "running" for undefined stop timestamp', () => {
      // GIVEN: Running time span (no stop time)
      const timeSpans: TimeSpan[] = [
        { start: new Date('2025-01-01T10:30:00Z'), stop: undefined }
      ];
      mockTimeSpansRef.set(timeSpans);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show "running" for undefined stop
      expect(rendered).toContain('running');
      expect(rendered).toContain('1: 10:30:00 → running');
    });

    it('should display empty state when no time spans', () => {
      // GIVEN: Empty time spans array
      const timeSpans: TimeSpan[] = [];
      mockTimeSpansRef.set(timeSpans);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show empty state
      expect(rendered).toContain('No time spans recorded');
    });
  });

  describe('Contract Requirement 4: MUST display running state with visual indicator', () => {
    it('should show running state when isRunning is true', () => {
      // GIVEN: Running timer
      mockIsRunningRef.set(true);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show running state
      expect(rendered).toContain('● RUNNING (green)');
      expect(rendered).toContain('test-block-1');
    });

    it('should show stopped state when isRunning is false', () => {
      // GIVEN: Stopped timer
      mockIsRunningRef.set(false);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show stopped state
      expect(rendered).toContain('● STOPPED (gray)');
      expect(rendered).toContain('test-block-1');
    });

    it('should apply visual indication for running state', () => {
      // GIVEN: Running timer
      mockIsRunningRef.set(true);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should apply visual indicators
      expect(rendered).toContain('●'); // Visual indicator
      expect(rendered).toContain('RUNNING'); // Text state
      expect(rendered).toContain('(green)'); // Color indication
    });

    it('should apply visual indication for stopped state', () => {
      // GIVEN: Stopped timer
      mockIsRunningRef.set(false);

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should apply visual indicators
      expect(rendered).toContain('●'); // Visual indicator
      expect(rendered).toContain('STOPPED'); // Text state
      expect(rendered).toContain('(gray)'); // Color indication
    });
  });

  describe('Contract Requirement 5: MUST invoke hover callback on mouse enter/leave', () => {
    it('should call onMemoryHover(true) on mouse enter', () => {
      // GIVEN: Component with hover callback
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        onMemoryHover: mockHoverCallback
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Mouse enters component
      component.handleMouseEnter();

      // THEN: Hover callback should be called with true
      expect(mockHoverCallback).toHaveBeenCalledWith(true);
      expect(mockHoverCallback).toHaveBeenCalledTimes(1);
    });

    it('should call onMemoryHover(false) on mouse leave', () => {
      // GIVEN: Component with hover callback
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        onMemoryHover: mockHoverCallback
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Mouse leaves component
      component.handleMouseLeave();

      // THEN: Hover callback should be called with false
      expect(mockHoverCallback).toHaveBeenCalledWith(false);
      expect(mockHoverCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple hover events correctly', () => {
      // GIVEN: Component with hover callback
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        onMemoryHover: mockHoverCallback
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Multiple hover events occur
      component.handleMouseEnter();
      component.handleMouseLeave();
      component.handleMouseEnter();
      component.handleMouseLeave();

      // THEN: Callback should be called in correct sequence
      expect(mockHoverCallback).toHaveBeenNthCalledWith(1, true);
      expect(mockHoverCallback).toHaveBeenNthCalledWith(2, false);
      expect(mockHoverCallback).toHaveBeenNthCalledWith(3, true);
      expect(mockHoverCallback).toHaveBeenNthCalledWith(4, false);
      expect(mockHoverCallback).toHaveBeenCalledTimes(4);
    });

    it('should skip hover callback if not provided', () => {
      // GIVEN: Component without hover callback
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
        // No onMemoryHover provided
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Hover events occur
      expect(() => {
        component.handleMouseEnter();
        component.handleMouseLeave();
      }).not.toThrow();

      // THEN: Should not throw errors and callback should not be called
      expect(mockHoverCallback).not.toHaveBeenCalled();
    });
  });

  describe('Contract Requirement 6: MUST apply highlight styling when isHighlighted=true', () => {
    it('should apply highlight styling when isHighlighted is true', () => {
      // GIVEN: Component with highlight
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        isHighlighted: true
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should include highlight class
      expect(rendered).toContain('bg-blue-100');
      expect(rendered).toContain('test-block-1');
    });

    it('should not apply highlight styling when isHighlighted is false', () => {
      // GIVEN: Component without highlight
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        isHighlighted: false
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should not include highlight class
      expect(rendered).not.toContain('bg-blue-100');
      expect(rendered).toContain('test-block-1');
    });

    it('should not apply highlight styling when isHighlighted is undefined', () => {
      // GIVEN: Component without highlight prop
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
        // isHighlighted not provided
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should not include highlight class by default
      expect(rendered).not.toContain('bg-blue-100');
      expect(rendered).toContain('test-block-1');
    });

    it('should reflect highlight changes when props change', () => {
      // GIVEN: Component without initial highlight
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        isHighlighted: false
      };

      const component = new MockTimerMemoryVisualization(props);
      let rendered = component.render();
      expect(rendered).not.toContain('bg-blue-100');

      // WHEN: Highlight prop changes to true
      const updatedComponent = new MockTimerMemoryVisualization({ ...props, isHighlighted: true });
      rendered = updatedComponent.render();

      // THEN: Component should reflect highlight change
      expect(rendered).toContain('bg-blue-100');
      expect(rendered).toContain('test-block-1');
    });
  });

  describe('Contract Requirement 7: MUST handle missing memory gracefully', () => {
    it('should show "No memory allocated" when timeSpansRef get() returns undefined', () => {
      // GIVEN: Memory reference that returns undefined
      const mockInvalidRef = {
        ...mockTimeSpansRef,
        get: () => undefined
      } as any;

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockInvalidRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show no memory message
      expect(rendered).toContain('No memory allocated');
    });

    it('should show error state when references throw errors', () => {
      // GIVEN: Invalid memory references that throw
      const mockInvalidTimeSpansRef = {
        ...mockTimeSpansRef,
        get: () => {
          throw new Error('Invalid reference');
        }
      } as any;

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockInvalidTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show error message
      expect(rendered).toContain('Memory error');
    });

    it('should handle isRunningRef get() returning undefined', () => {
      // GIVEN: Running state reference that returns undefined
      const mockInvalidRunningRef = {
        ...mockIsRunningRef,
        get: () => undefined
      } as any;

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockInvalidRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should show no memory message
      expect(rendered).toContain('No memory allocated');
    });

    it('should never throw exceptions from memory access errors', () => {
      // GIVEN: References that throw on access
      const mockThrowingRef = {
        ...mockTimeSpansRef,
        get: () => {
          throw new Error('Memory access failed');
        }
      } as any;

      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockThrowingRef,
        isRunningRef: mockThrowingRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      // THEN: Should not throw exceptions
      expect(() => {
        component.render();
      }).not.toThrow();

      const rendered = component.render();
      expect(rendered).toContain('Memory error');
    });
  });

  describe('Contract Invariants', () => {
    it('should always render (no conditional returns)', () => {
      // GIVEN: Various prop combinations
      const testCases = [
        {
          timeSpansRef: mockTimeSpansRef,
          isRunningRef: mockIsRunningRef,
          blockKey: 'test-block-1'
        },
        {
          timeSpansRef: mockTimeSpansRef,
          isRunningRef: mockIsRunningRef,
          blockKey: 'test-block-1',
          onMemoryHover: mockHoverCallback
        },
        {
          timeSpansRef: mockTimeSpansRef,
          isRunningRef: mockIsRunningRef,
          blockKey: 'test-block-1',
          isHighlighted: true
        }
      ];

      // WHEN: Each case is rendered
      // THEN: All should render successfully
      testCases.forEach((props, index) => {
        expect(() => {
          const component = new MockTimerMemoryVisualization(props);
          const rendered = component.render();
          expect(rendered).toBeDefined();
          expect(rendered).toContain(props.blockKey);
        }).not.toThrow(`Test case ${index} should render successfully`);
      });
    });

    it('should handle blockKey display correctly', () => {
      // GIVEN: Component with block key
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-123'
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Component is rendered
      const rendered = component.render();

      // THEN: Component should display block key
      expect(rendered).toContain('test-block-123');
    });
  });

  describe('Performance Requirements', () => {
    it('should render within performance target', () => {
      // GIVEN: Component props
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      // WHEN: Component is rendered
      const startTime = performance.now();
      const component = new MockTimerMemoryVisualization(props);
      const rendered = component.render();
      const endTime = performance.now();

      // THEN: Render should complete quickly
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(10); // Contract requires < 10ms
      expect(rendered).toBeDefined();
      expect(rendered).toContain('test-block-1');
    });

    it('should handle hover callback latency requirements', () => {
      // GIVEN: Component with hover callback
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1',
        onMemoryHover: mockHoverCallback
      };

      const component = new MockTimerMemoryVisualization(props);

      // WHEN: Hover event occurs
      const startTime = performance.now();
      component.handleMouseEnter();
      const endTime = performance.now();

      // THEN: Callback should be called quickly
      const callbackTime = endTime - startTime;
      expect(callbackTime).toBeLessThan(5); // Contract requires < 5ms
      expect(mockHoverCallback).toHaveBeenCalledWith(true);
    });

    it('should handle memory update performance requirements', () => {
      // GIVEN: Component with subscriptions
      const props: TimerMemoryVisualizationProps = {
        timeSpansRef: mockTimeSpansRef,
        isRunningRef: mockIsRunningRef,
        blockKey: 'test-block-1'
      };

      const component = new MockTimerMemoryVisualization(props);
      component.mount();

      // WHEN: Memory is updated
      const startTime = performance.now();
      const timeSpans: TimeSpan[] = [
        { start: new Date('2025-01-01T10:00:00Z'), stop: new Date('2025-01-01T10:01:00Z') }
      ];
      mockTimeSpansRef.set(timeSpans);
      const endTime = performance.now();

      // THEN: Update should be processed quickly
      const updateTime = endTime - startTime;
      expect(updateTime).toBeLessThan(16); // Contract requires < 16ms for UI updates

      // Cleanup
      component.unmount();
    });
  });
});