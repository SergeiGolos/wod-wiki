/**
 * HomeAnalyticsRunway.test.tsx — contracts for the analytics scroll runway:
 * the staged decomposition of the WQL showcase (#938 → scroll-driven), its
 * section anchor, and the one-shot enter-view quest callback.
 */
import { beforeEach, afterEach, describe, expect, it } from 'bun:test';
import { render, screen, cleanup, act } from '@testing-library/react';
import { HomeAnalyticsRunway, ANALYTICS_STAGES } from './HomeAnalyticsRunway';
import { SAMPLE_HOME_ANALYTICS } from './homeAnalyticsData';
import type { HomeAnalyticsData } from './homeAnalyticsData';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  rootMargin = ''
  cb: IntersectionObserverCallback
  disconnected = false
  constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
    this.cb = cb
    this.rootMargin = opts?.rootMargin ?? ''
    MockIntersectionObserver.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  trigger(entries: { target: Element; isIntersecting: boolean }[]) {
    if (this.disconnected) return
    this.cb(
      entries.map((e) => ({ ...e, intersectionRatio: 1, boundingClientRect: {} as DOMRectReadOnly })) as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    )
  }
}

const realIO = globalThis.IntersectionObserver
beforeEach(() => {
  MockIntersectionObserver.instances = []
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
})
afterEach(() => {
  cleanup()
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = realIO
})

const data: HomeAnalyticsData = SAMPLE_HOME_ANALYTICS

describe('HomeAnalyticsRunway', () => {
  it('decomposes the showcase into five ordered stages covering the track', () => {
    expect(ANALYTICS_STAGES.map((s) => s.id)).toEqual([
      'wql-idea',
      'wql-table',
      'wql-graphs',
      'wql-dashboard',
      'wql-live',
    ])
    // Contiguous ranges over [0,1].
    expect(ANALYTICS_STAGES[0].range[0]).toBe(0)
    expect(ANALYTICS_STAGES[ANALYTICS_STAGES.length - 1].range[1]).toBe(1)
    for (let i = 1; i < ANALYTICS_STAGES.length; i++) {
      expect(ANALYTICS_STAGES[i].range[0]).toBe(ANALYTICS_STAGES[i - 1].range[1])
    }
    // Highlight beats carry ring keys; the closing beat does not.
    expect(
      ANALYTICS_STAGES.slice(0, 4).map((s) => (s.ring === true ? undefined : s.ring?.key)),
    ).toEqual(['analytics.vocab', 'analytics.table', 'analytics.graphs', 'analytics.dashboard'])
    expect(ANALYTICS_STAGES[4].ring).toBeUndefined()
  })

  it('renders the section anchor with all caption beats', () => {
    render(<HomeAnalyticsRunway data={data} />)

    expect(screen.getByTestId('home-analytics-section')).toBeTruthy()
    for (const stage of ANALYTICS_STAGES) {
      expect(screen.getByText(stage.title)).toBeTruthy()
    }
  })

  it('fires onEnterView once when the runway scrolls into view', async () => {
    let calls = 0
    render(<HomeAnalyticsRunway data={data} onEnterView={() => { calls++ }} />)

    const io = MockIntersectionObserver.instances.find((o) => o.rootMargin === '-30% 0px')
    expect(io).toBeTruthy()
    const section = screen.getByTestId('home-analytics-section')
    await act(async () => {
      io!.trigger([{ target: section, isIntersecting: true }])
      await Promise.resolve()
    })

    expect(calls).toBe(1)

    // Re-intersections must not re-fire (the observer disconnects).
    await act(async () => {
      io!.trigger([{ target: section, isIntersecting: true }])
      await Promise.resolve()
    })
    expect(calls).toBe(1)
  })
});
