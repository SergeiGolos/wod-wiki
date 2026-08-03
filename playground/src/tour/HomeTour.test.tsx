/**
 * HomeTour.test.tsx — route-level component test for the redesigned home page.
 *
 * Asserts the locked section order, the short-circuit strip exits, the
 * Timer/Analytics stage drop-off hrefs, and the telemetry funnel events.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react'
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
  if (progress < 0.15) {
    const t = progress / 0.15
    return {
      index: 0,
      stage: {
        id: 'editor-blank',
        screen: 'editor',
        accent: 'hsl(var(--metric-resistance))',
        label: 'Start with a Blank Page',
      },
      t,
      ring: { key: 'editor.fence', tag: '```time Fence' },
    }
  }
  if (progress < 0.30) {
    const t = (progress - 0.15) / 0.15
    return {
      index: 1,
      stage: {
        id: 'editor-metrics',
        screen: 'editor',
        accent: 'hsl(var(--metric-resistance))',
        label: 'Every Line Collects Metrics',
      },
      t,
      ring: { key: 'editor.wodBlock', tag: 'Line Metrics' },
    }
  }
  if (progress < 0.45) {
    const t = (progress - 0.30) / 0.15
    return {
      index: 2,
      stage: {
        id: 'editor-run',
        screen: 'editor',
        accent: 'hsl(var(--metric-resistance))',
        label: 'Press Run to Start',
      },
      t,
      ring: { key: 'editor.runButton', tag: 'Run Button' },
    }
  }
  if (progress < 0.60) {
    const t = (progress - 0.45) / 0.15
    return {
      index: 3,
      stage: {
        id: 'timer-wallclock',
        screen: 'timer',
        accent: 'hsl(var(--metric-effort))',
        label: 'What Happens When It Runs',
      },
      t,
      ring: { key: 'timer.floor', tag: 'WallClock' },
    }
  }
  if (progress < 0.72) {
    const t = (progress - 0.60) / 0.12
    return {
      index: 4,
      stage: {
        id: 'timer-cast',
        screen: 'timer',
        accent: 'hsl(var(--metric-effort))',
        label: 'Broadcast the Timer',
      },
      t,
      ring: { key: 'timer.cast', tag: 'Chromecast' },
    }
  }
  if (progress < 0.86) {
    const t = (progress - 0.72) / 0.14
    return {
      index: 5,
      stage: {
        id: 'analytics-scorecard',
        screen: 'analytics',
        accent: 'hsl(var(--metric-rounds))',
        label: 'Explore Your Data',
      },
      t,
      ring: { key: 'analytics.scorecard', tag: 'Scorecard' },
    }
  }
  const t = (progress - 0.86) / 0.14
  return {
    index: 6,
    stage: {
      id: 'analytics-grid',
      screen: 'analytics',
      accent: 'hsl(var(--metric-rounds))',
      label: 'Session Review',
    },
    t,
    ring: { key: 'analytics.grid', tag: 'Review Grid' },
  }
}

mock.module('./useTourScroll', () => {
  const React = require('react')
  const store: { slice: TestSlice; listeners: Set<() => void> } = {
    slice: makeSlice(0.50),
    listeners: new Set(),
  }

  function setTestTourProgress(progress: number) {
    store.slice = makeSlice(progress)
    store.listeners.forEach((cb) => cb())
  }

  // Expose the driver on globalThis so the test can switch slices without
  // statically importing the mocked module (which would resolve before the mock).
  const control = globalThis as unknown as {
    setTestTourProgress?: (p: number) => void
    scrollRunwayToCalls?: number
  }
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
    scrollRunwayTo: () => {
      control.scrollRunwayToCalls = (control.scrollRunwayToCalls ?? 0) + 1
    },
  }
})

import { HomeTour } from './HomeTour'

// jsdom lacks ResizeObserver; Headless UI's combobox machine touches it when
// the option list closes after a selection.
const globalWithResizeObserver = globalThis as unknown as { ResizeObserver?: unknown }
globalWithResizeObserver.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const setTestTourProgress = (progress: number) => {
  // globalThis is augmented by the useTourScroll mock factory at runtime.
  const control = globalThis as unknown as { setTestTourProgress?: (p: number) => void }
  control.setTestTourProgress?.(progress)
}

// Scroll-spy access — globalThis is augmented by the useTourScroll mock factory.
type ScrollSpy = { scrollRunwayToCalls?: number }
const scrollSpyControl = () => globalThis as unknown as ScrollSpy
const resetScrollSpy = () => {
  scrollSpyControl().scrollRunwayToCalls = 0
}
const scrollRunwayToCallCount = () => scrollSpyControl().scrollRunwayToCalls ?? 0

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
      />
    </MemoryRouter>,
  )
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
    setTestTourProgress(0.50)
    resetScrollSpy()
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
    await renderHomeTour()
    const strip = await screen.findByTestId('tour-short-circuit-strip')
    expect(strip).toBeTruthy()
    const libraryLink = screen.getByRole('link', { name: /Jump to the Library/i })
    expect(libraryLink.getAttribute('href')).toBe('/library')
    const newNoteButton = screen.getByRole('button', { name: /New note/i })
    expect(newNoteButton).toBeTruthy()
  })

  it('exposes timer and analytics stage drop-offs with correct hrefs', async () => {
    await renderHomeTour()

    // Timer stage is the initial slice.
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    expect(behaviorsLink.getAttribute('href')).toBe('/guide/behaviors')

    // Drive to the Analytics Scorecard stage.
    await act(async () => {
      setTestTourProgress(0.78)
      await Promise.resolve()
    })
    const explorerLink = await screen.findByRole('link', { name: /Run a pre-filled query/i })
    expect(explorerLink.getAttribute('href')).toContain('/analytics/explorer')
    expect(explorerLink.getAttribute('href')).toContain('q=')

    const dashboardLink = screen.getByRole('link', { name: /Open the dashboard/i })
    expect(dashboardLink.getAttribute('href')).toBe('/analytics/dashboard')

    // Drive to the Analytics Grid stage.
    await act(async () => {
      setTestTourProgress(0.92)
      await Promise.resolve()
    })
    const analyticsGuideLink = screen.getByRole('link', { name: /Read the query guide/i })
    expect(analyticsGuideLink.getAttribute('href')).toBe('/guide/analytics')

    const effortsLinks = screen.getAllByRole('link', { name: /Browse the registry/i })
    expect(effortsLinks.length).toBeGreaterThanOrEqual(1)
    for (const link of effortsLinks) {
      expect(link.getAttribute('href')).toBe('/efforts')
    }
  })

  it('renders the static areas in locked order', async () => {
    await renderHomeTour()
    const headings = (await screen.findAllByRole('heading')).map((h) => h.textContent)
    const exploreIndex = headings.findIndex((h) => h?.includes('What Happens When It Runs') || h?.includes('Explore Your Data'))
    const learnIndex = headings.findIndex((h) => h?.includes('Learn the Language'))
    const registryIndex = headings.findIndex((h) => h?.includes('The Movement Registry'))
    const referenceIndex = headings.findIndex((h) => h?.includes('Quick Reference'))

    expect(exploreIndex).toBeGreaterThanOrEqual(0)
    expect(exploreIndex).toBeLessThan(learnIndex)
    expect(learnIndex).toBeLessThan(registryIndex)
    expect(registryIndex).toBeLessThan(referenceIndex)
  })

  it('starts a new playground session based on initial editor content when scrolling into timer stage', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
    })
    const backButton = await screen.findByTitle('Back to the tour')
    expect(backButton).toBeTruthy()
  })

  it('records the matching home:* event when a drop-off is clicked', async () => {
    await renderHomeTour()

    const libraryLink = await screen.findByRole('link', { name: /Jump to the Library/i })
    fireEvent.click(libraryLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.libraryOpened)

    // Drive to the analytics-scorecard stage and click a drop-off.
    await act(async () => {
      setTestTourProgress(0.78)
      await Promise.resolve()
    })
    const explorerLink = await screen.findByRole('link', { name: /Run a pre-filled query/i })
    fireEvent.click(explorerLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.explorerOpened)

    await act(async () => {
      setTestTourProgress(0.92)
      await Promise.resolve()
    })
    const analyticsGuideLink = await screen.findByRole('link', { name: /Read the query guide/i })
    fireEvent.click(analyticsGuideLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.analyticsGuideOpened)

    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
    })
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    fireEvent.click(behaviorsLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.behaviorsOpened)
  })
  it('desktop hero Run mounts the fullscreen overlay with WallClock and exit pill', async () => {
    await renderHomeTour()
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

  it('hero Run opens the fullscreen playground without scrolling the page', async () => {
    await renderHomeTour()
    const runButton = await screen.findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    expect(await screen.findByTestId('tour-playground-overlay')).toBeTruthy()
    // The overlay is fixed-position: the runway is never scrolled into view.
    expect(scrollRunwayToCallCount()).toBe(0)
  })

  it('keeps the hero editor and the runway editor independent', async () => {
    await renderHomeTour()
    const editors = screen.getAllByTestId('mock-note-editor') as HTMLTextAreaElement[]
    const [hero, runway] = editors
    expect(editors.length).toBe(2)
    // Same arrival content, separate documents.
    expect(hero.value).toBe(runway.value)

    fireEvent.change(hero, { target: { value: 'HERO EDITS' } })
    expect(hero.value).toBe('HERO EDITS')
    expect(runway.value).not.toBe('HERO EDITS')

    fireEvent.change(runway, { target: { value: 'RUNWAY EDITS' } })
    expect(runway.value).toBe('RUNWAY EDITS')
    expect(hero.value).toBe('HERO EDITS')
  })

  it('offers workout presets in a combo box that loads into the runway demo only', async () => {
    await renderHomeTour()
    // Drive to the editor-blank slide — its caption (with the combo box) is
    // aria-hidden unless active.
    await act(async () => {
      setTestTourProgress(0.05)
      await Promise.resolve()
    })
    const input = await screen.findByRole('combobox', { name: /load a workout into the demo/i })
    expect(input).toBeTruthy()

    // Open the option list via the combo box toggle (synthetic focus doesn't
    // trip Headless UI's `immediate` open under jsdom).
    const wrapper = screen.getByTestId('tour-workout-choices')
    const toggle = wrapper.querySelector('button')
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle!)

    const heroValueBefore = (screen.getAllByTestId('mock-note-editor')[0] as HTMLTextAreaElement).value

    const option = await screen.findByText('21-15-9 Rep Scaling')
    await act(async () => {
      // Headless UI selects a ComboboxOption on mouseDown, not click.
      fireEvent.mouseDown(option)
      await Promise.resolve()
    })

    const editors = screen.getAllByTestId('mock-note-editor') as HTMLTextAreaElement[]
    // The pick replaces the runway demo script…
    expect(editors[1].value).toContain('Kettlebell Swings 24kg')
    // …and leaves the hero document untouched.
    expect(editors[0].value).toBe(heroValueBefore)
  })

  it('prompts "take one for a spin" above the picker and keeps it out of the editor window header', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.05)
      await Promise.resolve()
    })

    // The prompt sits above the combo box in the active caption.
    const prompt = await screen.findByTestId('tour-workout-choices-prompt')
    expect(prompt.textContent?.toLowerCase()).toContain('take one for a spin')

    // The picker lives in the caption column…
    const captions = screen.getByTestId('tour-captions')
    expect(
      within(captions).getByRole('combobox', { name: /load a workout into the demo/i }),
    ).toBeTruthy()
    // …and never in an editor window header (#883) — hero and runway alike.
    for (const header of screen.getAllByTestId('tour-editor-header')) {
      expect(within(header).queryByRole('combobox')).toBeNull()
      expect(within(header).queryByTestId('tour-workout-choices')).toBeNull()
    }
  })
})
