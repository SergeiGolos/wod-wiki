/**
 * ScrollSection.test.tsx — unit tests for the ScrollSection primitive component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ScrollSection } from './ScrollSection'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()

let observerCallback: (entries: IntersectionObserverEntry[]) => void

beforeEach(() => {
  mockObserve.mockReset()
  mockDisconnect.mockReset()

  const ioMock = vi.fn().mockImplementation((cb) => {
    observerCallback = cb
    return {
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: mockDisconnect,
    }
  })

  window.IntersectionObserver = ioMock as unknown as typeof IntersectionObserver
  globalThis.IntersectionObserver = ioMock as unknown as typeof IntersectionObserver

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('ScrollSection', () => {
  it('renders stickyView, slides, and footer', () => {
    render(
      <ScrollSection
        id="test-section"
        title="Test Section"
        stickyView={<div data-testid="sticky-content">Sticky Content</div>}
        slides={<div data-testid="slides-content">Slides Content</div>}
        footer={<div data-testid="footer-content">Footer Content</div>}
      />,
    )

    expect(screen.getByText('Test Section')).toBeTruthy()
    expect(screen.getByTestId('sticky-content')).toBeTruthy()
    expect(screen.getByTestId('slides-content')).toBeTruthy()
    expect(screen.getByTestId('footer-content')).toBeTruthy()
  })

  it('notifies onVisibilityChange when IntersectionObserver triggers', () => {
    const onVisibilityChange = vi.fn()
    render(
      <ScrollSection
        id="test-section"
        stickyView={<div>Sticky</div>}
        slides={<div>Slides</div>}
        onVisibilityChange={onVisibilityChange}
      />,
    )

    expect(mockObserve).toHaveBeenCalled()

    // Trigger intersection
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry])
    expect(onVisibilityChange).toHaveBeenCalledWith(true)

    observerCallback([{ isIntersecting: false } as IntersectionObserverEntry])
    expect(onVisibilityChange).toHaveBeenCalledWith(false)
  })

  it('reports the active slide via onActiveSlideChange, debounced to index changes', () => {
    const onActiveSlideChange = vi.fn()
    render(
      <ScrollSection
        id="test-section"
        stickyView={<div>Sticky</div>}
        onActiveSlideChange={onActiveSlideChange}
        slides={
          <div>
            <div data-slide-index={0}>Slide A</div>
            <div data-slide-index={1}>Slide B</div>
          </div>
        }
      />,
    )

    // Both slide slots are observed.
    expect(mockObserve).toHaveBeenCalledTimes(2)

    const slot = (i: number) => ({ dataset: { slideIndex: String(i) } }) as unknown as HTMLElement

    // Slide 0 enters the reading zone.
    observerCallback([{ isIntersecting: true, target: slot(0) } as IntersectionObserverEntry])
    expect(onActiveSlideChange).toHaveBeenLastCalledWith(0)

    // Same index again is not re-fired (debounced).
    observerCallback([{ isIntersecting: true, target: slot(0) } as IntersectionObserverEntry])
    expect(onActiveSlideChange).toHaveBeenCalledTimes(1)

    // Slide 1 replaces it.
    observerCallback([{ isIntersecting: true, target: slot(1) } as IntersectionObserverEntry])
    expect(onActiveSlideChange).toHaveBeenLastCalledWith(1)
    expect(onActiveSlideChange).toHaveBeenCalledTimes(2)
  })
})
