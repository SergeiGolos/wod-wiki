import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { telemetry, type TelemetryEvent } from './TelemetryService';
import { useScrollTelemetry } from './useScrollTelemetry';

describe('useScrollTelemetry', () => {
  let events: TelemetryEvent[] = [];
  let unsubscribe: () => void = () => {};

  beforeEach(() => {
    events = [];
    unsubscribe = telemetry.events.subscribe((e) => {
      if (e.name === 'scroll') events.push(e);
    });

    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 500 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 1500, // maxScroll = 1000
    });
    window.scrollY = 0;
  });

  afterEach(() => {
    unsubscribe();
  });

  it('records scroll milestones as the user scrolls down', () => {
    renderHook(() => useScrollTelemetry('/guide/start'));

    // Scroll to 250px (25%)
    act(() => {
      window.scrollY = 250;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25]);
    expect(events[0].payload?.page_path).toBe('/guide/start');

    // Scroll to 500px (50%)
    act(() => {
      window.scrollY = 500;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25, 50]);

    // Scrolling back up does not duplicate
    act(() => {
      window.scrollY = 100;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25, 50]);

    // Scroll to bottom (100% -> triggers 75 and 90)
    act(() => {
      window.scrollY = 1000;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25, 50, 75, 90]);
  });

  it('does nothing when path is undefined', () => {
    renderHook(() => useScrollTelemetry(undefined));

    act(() => {
      window.scrollY = 800;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events).toHaveLength(0);
  });

  it('resets milestones when route path changes', () => {
    let currentPath = '/';
    const { rerender } = renderHook(() => useScrollTelemetry(currentPath));

    act(() => {
      window.scrollY = 500;
      window.dispatchEvent(new window.Event('scroll'));
    });
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25, 50]);

    // Change page to guide
    currentPath = '/guide/start';
    rerender();

    act(() => {
      window.scrollY = 500;
      window.dispatchEvent(new window.Event('scroll'));
    });
    // Triggers 25 and 50 again for new page
    expect(events.map((e) => e.payload?.percent_scrolled)).toEqual([25, 50, 25, 50]);
    expect(events[2].payload?.page_path).toBe('/guide/start');
  });
});
