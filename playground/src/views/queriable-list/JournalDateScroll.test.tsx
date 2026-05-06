import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';

import { JournalDateScroll } from './JournalDateScroll';

interface ObserverRecord {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
}

const observerRecords: ObserverRecord[] = [];
const originalIntersectionObserver = globalThis.IntersectionObserver;
const originalScrollTo = window.scrollTo;
const originalScrollBy = window.scrollBy;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(public callback: IntersectionObserverCallback) {
    observerRecords.push({ callback, elements: new Set() });
  }

  disconnect(): void {
    const record = observerRecords.find(entry => entry.callback === this.callback);
    record?.elements.clear();
  }

  observe(target: Element): void {
    const record = observerRecords.find(entry => entry.callback === this.callback);
    record?.elements.add(target);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    const record = observerRecords.find(entry => entry.callback === this.callback);
    record?.elements.delete(target);
  }
}

function triggerIntersection(target: Element, isIntersecting: boolean) {
  const record = observerRecords.find(entry => entry.elements.has(target));
  if (!record) {
    throw new Error('No observer registered for target');
  }

  record.callback(
    [
      {
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
}

describe('JournalDateScroll', () => {
  beforeEach(() => {
    observerRecords.length = 0;
    globalThis.IntersectionObserver = MockIntersectionObserver as typeof IntersectionObserver;
    window.scrollTo = (() => {}) as typeof window.scrollTo;
    window.scrollBy = (() => {}) as typeof window.scrollBy;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    observerRecords.length = 0;
    globalThis.IntersectionObserver = originalIntersectionObserver;
    window.scrollTo = originalScrollTo;
    window.scrollBy = originalScrollBy;
  });

  it('does not prepend future dates on mount until the user scrolls', async () => {
    const { container, getByTestId } = render(
      <JournalDateScroll
        items={[]}
        onSelect={() => {}}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('[id]').length).toBe(8);
    });

    const topSentinel = getByTestId('top-sentinel');
    triggerIntersection(topSentinel, true);

    expect(container.querySelectorAll('[id]').length).toBe(8);

    window.dispatchEvent(new window.Event('scroll'));
    triggerIntersection(topSentinel, true);

    await waitFor(() => {
      expect(container.querySelectorAll('[id]').length).toBe(15);
    });
  });
});