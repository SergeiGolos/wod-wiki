/**
 * HomeTour.test.tsx — route-level component test for the redesigned home page.
 *
 * Asserts the locked section order, the short-circuit strip exits, the
 * Timer/Analytics stage drop-off hrefs, and the telemetry funnel events.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'

// ── Heavy / browser-only dependencies ───────────────────────────────────────

mock.module('@/components/organisms/editor/NoteEditor', () => ({
  NoteEditor: (props: {
    value?: string
    onChange?: (value: string) => void
    onBlocksChange?: (blocks: ScriptBlock[]) => void
  }) => {
    const React = require('react')
    React.useEffect(() => {
      // Inject a minimal block so the Run action has a compiled block to use.
      props.onBlocksChange?.([{ id: 'block-1', type: 'Timer' } as unknown as ScriptBlock])
    }, [])
    return (
      <textarea
        data-testid="mock-note-editor"
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    )
  },
}))

mock.module('@/components/organisms/editor/RuntimeTimerPanel', () => ({
  RuntimeTimerPanel: () => <div data-testid="mock-timer-panel" />,
}))

mock.module('@/components/organisms/review/AnalyticsScorecard', () => ({
  AnalyticsScorecard: () => null,
}))

mock.module('@/components/organisms/review/ReviewGrid', () => ({
  ReviewGrid: () => null,
}))

mock.module('@/components/organisms/cast/CastButtonRpc', () => ({
  CastButtonRpc: () => null,
}))

mock.module('../hooks/useQuickStartAutoComplete', () => ({
  useQuickStartAutoComplete: () => {},
}))

mock.module('../hooks/useCompletionChallenge', () => ({
  useCompletionChallenge: () => {},
}))

mock.module('../hooks/useRunStartedChallenge', () => ({
  useRunStartedChallenge: () => {},
}))

mock.module('../hooks/useTourScrollQuests', () => ({
  useTourScrollQuests: () => () => {},
}))

mock.module('../services/resultRecorder', () => ({
  playgroundRecorder: { record: async () => {} },
}))

mock.module('../services/journalWorkout', () => ({
  createJournalNoteFromWorkout: async () => ({ id: 'note-clone' }),
}))

mock.module('../services/journalNotes', () => ({
  journalNotes: { create: async () => ({ id: 'note-new' }) },
}))

mock.module('../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

// ── useTourScroll mock — lets the test drive the active stage ───────────────

type TestSlice = {
  index: number
  stage: { id: string; screen: string; accent: string; label: string }
  t: number
  ring: { key: string; tag?: string } | null
}

function makeSlice(progress: number): TestSlice {
  if (progress < 0.5) {
    const t = progress / 0.5
    return {
      index: 0,
      stage: {
        id: 'timer',
        screen: 'timer',
        accent: 'hsl(var(--metric-effort))',
        label: 'What Happens When It Runs',
      },
      t,
      ring: { key: 'timer.floor', tag: 'WallClock' },
    }
  }
  const t = (progress - 0.5) / 0.5
  return {
    index: 1,
    stage: {
      id: 'analytics',
      screen: 'analytics',
      accent: 'hsl(var(--metric-rounds))',
      label: 'Explore Your Data',
    },
    t,
    ring: { key: 'analytics.scorecard', tag: 'Review' },
  }
}

mock.module('./useTourScroll', () => {
  const React = require('react')
  const store: { slice: TestSlice; listeners: Set<() => void> } = {
    slice: makeSlice(0.1),
    listeners: new Set(),
  }

  function setTestTourProgress(progress: number) {
    store.slice = makeSlice(progress)
    store.listeners.forEach((cb) => cb())
  }

  // Expose the driver on globalThis so the test can switch slices without
  // statically importing the mocked module (which would resolve before the mock).
  const control = globalThis as unknown as { setTestTourProgress?: (p: number) => void }
  control.setTestTourProgress = setTestTourProgress

  return {
    useTourScroll: () => {
      const [, force] = React.useReducer((n: number) => n + 1, 0)
      React.useEffect(() => {
        store.listeners.add(force)
        return () => store.listeners.delete(force)
      }, [])
      return {
        slice: store.slice,
        progress: 0,
        runwayReached: store.slice.t > 0 || store.slice.index > 0,
        subscribe: () => () => {},
        resync: () => {},
      }
    },
    scrollRunwayTo: () => {},
  }
})

import { HomeTour } from './HomeTour'

const setTestTourProgress = (progress: number) => {
  // globalThis is augmented by the useTourScroll mock factory at runtime.
  const control = globalThis as unknown as { setTestTourProgress?: (p: number) => void }
  control.setTestTourProgress?.(progress)
}

// ── Test data ───────────────────────────────────────────────────────────────

const wodFiles: Record<string, string> = {
  'wods/examples/home/welcome-1.md': 'AMRAP 10\n  10 Pull-ups\n  15 Push-ups\n  20 Air Squats\n',
}

const homeQuests: Quest[] = [
  { id: 'qs-arrive', label: 'Welcome to WOD Wiki' },
  { id: 'qs-tour-timer', label: 'See the timer run it' },
  { id: 'qs-tour-analytics', label: 'Review the session' },
]

const chapters: Chapter[] = [
  {
    id: 'home-tour',
    title: 'Take the Tour',
    badge: 'play',
    questIds: ['qs-arrive', 'qs-tour-timer', 'qs-tour-analytics'],
    sectionIds: [],
  },
  {
    id: 'basics',
    title: 'Basics',
    badge: 'trophy',
    questIds: ['basics-movement'],
    sectionIds: [],
  },
  {
    id: 'protocols',
    title: 'Protocols',
    badge: 'timer',
    questIds: ['protocols-timer'],
    sectionIds: [],
  },
]

const questLabels: Record<string, string> = {
  'basics-movement': 'Add a movement',
  'protocols-timer': 'Add a timer',
}

async function renderHomeTour() {
  const result = render(
    <MemoryRouter>
      <HomeTour
        wodFiles={wodFiles}
        theme="light"
        quests={homeQuests}
        chapters={chapters}
        questLabels={questLabels}
      />
    </MemoryRouter>,
  )
  // Flush any post-mount effects that update state.
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('HomeTour', () => {
  let recorded: Array<{ name: string; payload?: Record<string, unknown> }> = []
  let unsubscribe: () => void = () => {}

  beforeEach(() => {
    recorded = []
    unsubscribe = telemetry.events.subscribe((event) => recorded.push(event))
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: false,
        media: '',
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }),
    })
  })

  afterEach(() => {
    unsubscribe()
    cleanup()
    window.localStorage.clear()
  })

  it('renders the short-circuit strip with Library and New note exits', async () => {
    renderHomeTour()
    const strip = await screen.findByTestId('tour-short-circuit-strip')
    expect(strip).toBeTruthy()

    const libraryLink = screen.getByRole('link', { name: /Jump to the Library/i })
    expect(libraryLink.getAttribute('href')).toBe('/library')
    const newNoteButton = screen.getByRole('button', { name: /New note/i })
    expect(newNoteButton).toBeTruthy()
  })

  it('exposes timer and analytics stage drop-offs with correct hrefs', async () => {
    renderHomeTour()

    // Timer stage is the initial slice.
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    expect(behaviorsLink.getAttribute('href')).toBe('/guide/behaviors')

    // Drive to the Analytics stage.
    await act(async () => {
      setTestTourProgress(0.6)
    })

    const explorerLink = await screen.findByRole('link', { name: /Run a pre-filled query/i })
    expect(explorerLink.getAttribute('href')).toContain('/analytics/explorer')
    expect(explorerLink.getAttribute('href')).toContain('q=')

    const dashboardLink = screen.getByRole('link', { name: /Open the dashboard/i })
    expect(dashboardLink.getAttribute('href')).toBe('/analytics/dashboard')

    const analyticsGuideLink = screen.getByRole('link', { name: /Read the query guide/i })
    expect(analyticsGuideLink.getAttribute('href')).toBe('/guide/analytics')
    const effortsLinks = screen.getAllByRole('link', { name: /Browse the registry/i })
    expect(effortsLinks.length).toBeGreaterThanOrEqual(1)
    for (const link of effortsLinks) {
      expect(link.getAttribute('href')).toBe('/efforts')
    }
  })

  it('renders the static areas in locked order', async () => {
    renderHomeTour()

    const headings = (await screen.findAllByRole('heading')).map((h) => h.textContent)
    const learnIndex = headings.findIndex((h) => h?.includes('Learn the Language'))
    const exploreIndex = headings.findIndex((h) => h?.includes('Explore Your Data'))
    const registryIndex = headings.findIndex((h) => h?.includes('The Movement Registry'))
    const referenceIndex = headings.findIndex((h) => h?.includes('Quick Reference'))

    expect(learnIndex).toBeGreaterThanOrEqual(0)
    expect(learnIndex).toBeLessThan(exploreIndex)
    expect(exploreIndex).toBeLessThan(registryIndex)
    expect(registryIndex).toBeLessThan(referenceIndex)
  })

  it('records the matching home:* event when a drop-off is clicked', async () => {
    renderHomeTour()

    const libraryLink = await screen.findByRole('link', { name: /Jump to the Library/i })
    fireEvent.click(libraryLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.libraryOpened)

    // Drive to the analytics stage and click a drop-off.
    setTestTourProgress(0.6)
    const explorerLink = await screen.findByRole('link', { name: /Run a pre-filled query/i })
    fireEvent.click(explorerLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.explorerOpened)

    const analyticsGuideLink = screen.getByRole('link', { name: /Read the query guide/i })
    fireEvent.click(analyticsGuideLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.analyticsGuideOpened)
    // Click the timer-stage drop-off as well.
    setTestTourProgress(0.1)
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    fireEvent.click(behaviorsLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.behaviorsOpened)
  })

  it('desktop hero Run mounts the fullscreen overlay with WallClock and exit pill', async () => {
    renderHomeTour()

    const runButton = await screen.findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    // The fullscreen overlay mounts above the ambient runway demo.
    const overlay = await screen.findByTestId('tour-playground-overlay')
    expect(overlay).toBeTruthy()

    // The mocked RuntimeTimerPanel (WallClock) renders inside the overlay.
    expect(overlay.querySelector('[data-testid="mock-timer-panel"]')).toBeTruthy()

    // Exit pill returns to the tour.
    const exitPill = await screen.findByRole('button', { name: /tap here to exit/i })
    expect(exitPill).toBeTruthy()
    await act(async () => {
      fireEvent.click(exitPill)
      await Promise.resolve()
    })

    // After exiting, the fullscreen overlay is removed. The ambient demo may
    // still render a timer panel in the runway, so we assert on the overlay.
    await waitFor(() => {
      expect(screen.queryByTestId('tour-playground-overlay')).toBeNull()
    })
  })
})
