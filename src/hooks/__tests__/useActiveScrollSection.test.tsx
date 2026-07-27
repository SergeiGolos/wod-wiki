import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { useActiveScrollSection } from '../useActiveScrollSection';

interface ObserverRecord {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
}

const observerRecords: ObserverRecord[] = [];
const originalIntersectionObserver = globalThis.IntersectionObserver;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(public callback: IntersectionObserverCallback) {
    observerRecords.push({ callback, elements: new Set() });
  }

  disconnect(): void {
    const record = observerRecords.find((entry) => entry.callback === this.callback);
    record?.elements.clear();
  }

  observe(target: Element): void {
    const record = observerRecords.find((entry) => entry.callback === this.callback);
    record?.elements.add(target);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    const record = observerRecords.find((entry) => entry.callback === this.callback);
    record?.elements.delete(target);
  }
}

function triggerIntersection(target: Element, intersectionRatio: number) {
  const record = observerRecords.find((entry) => entry.elements.has(target));
  if (!record) {
    throw new Error(`No observer registered for target ${(target as HTMLElement).id}`);
  }

  record.callback(
    [
      {
        target,
        isIntersecting: intersectionRatio > 0,
        intersectionRatio,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
}

describe('useActiveScrollSection', () => {
  beforeEach(() => {
    observerRecords.length = 0;
    globalThis.IntersectionObserver = MockIntersectionObserver as typeof IntersectionObserver;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    observerRecords.length = 0;
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('tracks the most visible observed section across callbacks', async () => {
    document.body.innerHTML = '<section id="alpha"></section><section id="beta"></section>';
    const onChange = mock();

    renderHook(() =>
      useActiveScrollSection({
        ids: ['alpha', 'beta'],
        onChange,
      }),
    );

    await waitFor(() => {
      expect(observerRecords.length).toBe(1);
    });

    const alpha = document.getElementById('alpha');
    const beta = document.getElementById('beta');
    expect(alpha).toBeTruthy();
    expect(beta).toBeTruthy();

    triggerIntersection(alpha!, 0.35);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('alpha');

    triggerIntersection(beta!, 0.65);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('beta');

    triggerIntersection(alpha!, 0.8);
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith('alpha');
  });

  it('suppresses updates rejected by shouldAcceptChange', async () => {
    document.body.innerHTML = '<section id="alpha"></section><section id="beta"></section>';
    const onChange = mock();

    renderHook(() =>
      useActiveScrollSection({
        ids: ['alpha', 'beta'],
        onChange,
        shouldAcceptChange: (id) => id === 'beta',
      }),
    );

    await waitFor(() => {
      expect(observerRecords.length).toBe(1);
    });

    const alpha = document.getElementById('alpha');
    const beta = document.getElementById('beta');
    expect(alpha).toBeTruthy();
    expect(beta).toBeTruthy();

    triggerIntersection(alpha!, 0.75);
    expect(onChange).not.toHaveBeenCalled();

    triggerIntersection(beta!, 0.85);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('beta');
  });

  it('does not emit duplicate updates for the same active section', async () => {
    document.body.innerHTML = '<section id="alpha"></section>';
    const onChange = mock();

    renderHook(() =>
      useActiveScrollSection({
        ids: ['alpha'],
        onChange,
      }),
    );

    await waitFor(() => {
      expect(observerRecords.length).toBe(1);
    });

    const alpha = document.getElementById('alpha');
    expect(alpha).toBeTruthy();

    triggerIntersection(alpha!, 0.4);
    triggerIntersection(alpha!, 0.9);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('alpha');
  });
});
