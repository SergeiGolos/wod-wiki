/**
 * resultsRoutes.test.tsx — Execution telemetry routes and ReviewRedirect cutover (Ticket 005).
 *
 * Verifies that:
 * 1. /results/:sessionId is the canonical detail and /sessions the canonical list.
 * 2. ReviewRedirect cleanly redirects legacy review URLs into /results/:sessionId
 *    instead of /dashboard.
 * 3. /dashboard remains strictly decoupled from review routing as the user's permanent dashboard canvas.
 */
import { describe, it, expect, afterEach } from 'bun:test'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ROUTE_PATTERNS, sessionDetailPath } from './routes'
import { ReviewRedirect } from './routeRedirects'

afterEach(() => {
  cleanup()
})
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
  it('redirects legacy /review/:runtimeId to /results/:sessionId', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/review/run-123']}>
        <Routes>
          <Route path="/review/:runtimeId" element={<ReviewRedirect />} />
          <Route path={ROUTE_PATTERNS.sessionDetail} element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results/run-123')
  })

  it('redirects legacy /note/:noteId/review/:sectionId/:resultId to /results/:sessionId', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review/sec-1/res-456']}>
        <Routes>
          <Route path="/note/:noteId/review/:sectionId/:resultId" element={<ReviewRedirect />} />
          <Route path={ROUTE_PATTERNS.sessionDetail} element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/results/res-456')
  })

  it('redirects legacy note review without resultId to /sessions?q=:session{note:...}', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review']}>
        <Routes>
          <Route path="/note/:noteId/review" element={<ReviewRedirect />} />
          <Route path="/sessions" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/sessions')
    expect(getByTestId('search').textContent).toBe('?q=%3Asession%7Bnote%3Amy-note%7D')
  })

  it('redirects section-only note review to /sessions?q=:session{note:...}', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/note/my-note/review/sec-1']}>
        <Routes>
          <Route path="/note/:noteId/review/:sectionId" element={<ReviewRedirect />} />
          <Route path="/sessions" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(getByTestId('pathname').textContent).toBe('/sessions')
    expect(getByTestId('search').textContent).toBe('?q=%3Asession%7Bnote%3Amy-note%7D')
  })
})

describe('Sessions route patterns', () => {
  it('exposes canonical sessions route patterns in ROUTE_PATTERNS', () => {
    expect(ROUTE_PATTERNS.sessions).toBe('/sessions')
    expect(ROUTE_PATTERNS.sessionDetail).toBe('/results/:sessionId')
    expect(ROUTE_PATTERNS.sessionDate).toBe('/session/:date')
    // The canonical detail builder and the pattern agree.
    expect(sessionDetailPath('res-1')).toBe('/results/res-1')
  })
})
