import { vi, expect } from 'vitest';

/**
 * Captures events emitted during a test.
 * Provides assertion helpers for validating event emissions.
 */
export class EventCapture {
  private events: Array<{ type: string; data: any; timestamp: number }> = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Registers a listener for a specific event type.
   */
  on(eventType: string, listener: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Removes a listener for a specific event type.
   */
  off(eventType: string, listener: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Records an emitted event.
   * Call this from your mock event bus.
   */
  recordEvent(eventType: string, data?: any): void {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };
    this.events.push(event);

    // Trigger listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Waits for a specific event to be emitted.
   * Returns a promise that resolves with the event data.
   */
  async capture(eventType: string, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(eventType, listener);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeoutMs);

      const listener = (data: any) => {
        clearTimeout(timeout);
        this.off(eventType, listener);
        resolve(data);
      };

      this.on(eventType, listener);

      // Check if event already emitted
      const existing = this.events.find(e => e.type === eventType);
      if (existing) {
        clearTimeout(timeout);
        this.off(eventType, listener);
        resolve(existing.data);
      }
    });
  }

  /**
   * Asserts that a specific event was emitted.
   * Optionally validates the event data.
   */
  assertEmitted(eventType: string, data?: any): void {
    const event = this.events.find(e => e.type === eventType);

    if (!event) {
      throw new Error(`Expected event "${eventType}" to be emitted, but it was not.`);
    }

    if (data !== undefined) {
      expect(event.data).toEqual(data);
    }
  }

  /**
   * Asserts that a specific event was NOT emitted.
   */
  assertNotEmitted(eventType: string): void {
    const event = this.events.find(e => e.type === eventType);

    if (event) {
      throw new Error(`Expected event "${eventType}" NOT to be emitted, but it was.`);
    }
  }

  /**
   * Asserts that events were emitted in a specific order.
   */
  assertEmittedInOrder(...eventTypes: string[]): void {
    const actualOrder = this.events.map(e => e.type);
    
    let lastIndex = -1;
    for (const eventType of eventTypes) {
      const index = actualOrder.indexOf(eventType, lastIndex + 1);
      if (index === -1) {
        throw new Error(
          `Expected events in order [${eventTypes.join(', ')}], ` +
          `but event "${eventType}" was not found after previous events.`
        );
      }
      lastIndex = index;
    }
  }

  /**
   * Returns the count of times an event was emitted.
   */
  getEventCount(eventType: string): number {
    return this.events.filter(e => e.type === eventType).length;
  }

  /**
   * Returns all events of a specific type.
   */
  getEvents(eventType: string): Array<{ data: any; timestamp: number }> {
    return this.events
      .filter(e => e.type === eventType)
      .map(e => ({ data: e.data, timestamp: e.timestamp }));
  }

  /**
   * Returns all captured events.
   */
  getAllEvents(): Array<{ type: string; data: any; timestamp: number }> {
    return [...this.events];
  }

  /**
   * Clears all captured events.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Returns a count of all captured events.
   */
  get count(): number {
    return this.events.length;
  }
}

/**
 * Creates a new EventCapture instance for testing.
 */
export function createEventCapture(): EventCapture {
  return new EventCapture();
}

/**
 * Creates a mock event bus that records emissions to an EventCapture.
 */
export function createMockEventBus(capture?: EventCapture): any {
  const eventCapture = capture || createEventCapture();

  return {
    emit: vi.fn((eventType: string, data?: any) => {
      eventCapture.recordEvent(eventType, data);
    }),
    on: vi.fn((eventType: string, listener: (data: any) => void) => {
      eventCapture.on(eventType, listener);
    }),
    off: vi.fn((eventType: string, listener: (data: any) => void) => {
      eventCapture.off(eventType, listener);
    }),
    once: vi.fn((eventType: string, listener: (data: any) => void) => {
      const onceListener = (data: any) => {
        listener(data);
        eventCapture.off(eventType, onceListener);
      };
      eventCapture.on(eventType, onceListener);
    }),
    capture: eventCapture,
  };
}
