/**
 * useTourScroll.test.ts — Unit tests for the home tour scroll driver.
 *
 * The hook resolves runway progress into the active stage and exposes a
 * `runwayReached` flag that distinguishes "hero is still visible" from
 * "the runway has entered the viewport". That flag gates the scroll-quest
 * completion effect so the first tour stage is not marked complete on mount
 * while the hero is still in view.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useTourScroll } from './useTourScroll';

const VIEWPORT_HEIGHT = 800;
const RUNWAY_HEIGHT = 5000;

function setRunwayPosition(el: HTMLElement, top: number) {
  const bottom = top + RUNWAY_HEIGHT;
  el.getBoundingClientRect = mock(() => ({
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: RUNWAY_HEIGHT,
    x: 0,
    y: top,
    toJSON: () => ({}),
  })) as unknown as typeof el.getBoundingClientRect;
  Object.defineProperty(el, 'offsetHeight', {
    configurable: true,
    value: RUNWAY_HEIGHT,
    writable: true,
  });
}

function makeRunway(initialTop: number): HTMLElement {
  const el = document.createElement('section');
  el.style.height = `${RUNWAY_HEIGHT}px`;
  setRunwayPosition(el, initialTop);
  document.body.appendChild(el);
  return el;
}

let originalInnerHeight: number;

beforeEach(() => {
  originalInnerHeight = window.innerHeight;
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: VIEWPORT_HEIGHT,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: originalInnerHeight,
    writable: true,
  });
  document.body.innerHTML = '';
});

describe('useTourScroll', () => {
  it('starts at the first runway stage with runwayReached false while the hero is visible', () => {
    // Runway starts below the viewport: rect.top > 0.
    const runway = makeRunway(VIEWPORT_HEIGHT + 100);
    const ref = { current: runway };

    const { result } = renderHook(() => useTourScroll(ref, false));

    // First stage is timer even though the hero is still visible.
    expect(result.current.slice.stage.id).toBe('timer');
    expect(result.current.runwayReached).toBe(false);
  });

  it('sets runwayReached true once the runway top reaches the viewport top', () => {
    const runway = makeRunway(0);
    const ref = { current: runway };

    const { result } = renderHook(() => useTourScroll(ref, false));

    expect(result.current.runwayReached).toBe(true);
  });

  it('updates runwayReached when scrolling from the hero into the runway', () => {
    const runway = makeRunway(VIEWPORT_HEIGHT + 100);
    const ref = { current: runway };

    const { result } = renderHook(() => useTourScroll(ref, false));
    expect(result.current.runwayReached).toBe(false);

    // Scroll far enough that the runway top crosses into the viewport.
    act(() => {
      setRunwayPosition(runway, -100);
      result.current.resync();
    });

    expect(result.current.runwayReached).toBe(true);
  });
});
