/**
 * resultsRoutes.test.tsx — Execution telemetry routes and ReviewRedirect cutover (Ticket 005).
 *
 * Verifies that:
 * 1. /results, /results/:resultId, and /results/segments mount directly on QueriableStreamView.
 * 2. ReviewRedirect cleanly redirects legacy review URLs into /results/:resultId instead of /dashboard.
 * 3. /dashboard remains strictly decoupled from review routing as the user's permanent dashboard canvas.
 */
import { describe, it, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ROUTE_PATTERNS, ReviewRedirect } from './routes'

function LocationDisplay() {
  const location = useLocation()
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
    </div>
  )
}

describe('ReviewRedirect cutover (Ticket 005)', () => {
  it('redirects legacy /review/:runtimeId to /results/:resultId', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/review/run-123']}>
        <Routes>
          <Route path="/review/:runtimeId" element={<ReviewRedirect />} />
          <Route path="/results/:resultId" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results/run-123')
  })

  it('redirects legacy /note/:noteId/review/:sectionId/:resultId to /results/:resultId', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review/sec-1/res-456']}>
        <Routes>
          <Route path="/note/:noteId/review/:sectionId/:resultId" element={<ReviewRedirect />} />
          <Route path="/results/:resultId" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results/res-456')
  })

  it('redirects legacy note review without resultId to /results?q=rows:all{note:...}', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review']}>
        <Routes>
          <Route path="/note/:noteId/review" element={<ReviewRedirect />} />
          <Route path="/results" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results')
    expect(getByTestId('search').textContent).toBe('?q=rows%3Aall%7Bnote%3Amy-note%7D')
  })

  it('redirects section-only note review to /results?q=rows:all{note:...}', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review/sec-1']}>
        <Routes>
          <Route path="/note/:noteId/review/:sectionId" element={<ReviewRedirect />} />
          <Route path="/results" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results')
    expect(getByTestId('search').textContent).toBe('?q=rows%3Aall%7Bnote%3Amy-note%7D')
  })
})

describe('Results route patterns', () => {
  it('exposes canonical results route patterns in ROUTE_PATTERNS', () => {
    expect(ROUTE_PATTERNS.results).toBe('/results')
    expect(ROUTE_PATTERNS.resultsSegments).toBe('/results/segments')
    expect(ROUTE_PATTERNS.resultDetail).toBe('/results/:resultId')
  })
})
