/**
 * HomeTour.test.tsx — route-level component test for the redesigned home page.
 *
 * Asserts the locked section order, the short-circuit strip exits, the
 * Timer/Analytics stage drop-off hrefs, and the telemetry funnel events.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter, ScrollSpec } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
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
      <div>
        <textarea
          data-testid="mock-note-editor"
          value={props.value ?? ''}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
        {/* Stand-ins for previewDecorations' styled fence lines, which the
            card-2 block highlight measures (#884). */}
        {(props.value ?? '').includes('```') && (
          <>
            <div className="cm-wod-fence-open" />
            <div className="cm-wod-inner" />
            <div className="cm-wod-fence-close" />
          </>
        )}
      </div>
    )
  },
}))

mock.module('@/components/organisms/editor/RuntimeTimerPanel', () => ({
  RuntimeTimerPanel: (props: {
    onComplete?: (blockId: string, results: WorkoutResults) => void
    externalPause?: boolean
  }) => {
    const control = globalThis as unknown as {
      mockTimerPanelMounts?: number
      fireTimerComplete?: (results: WorkoutResults) => void
    }
    const React = require('react')
    React.useEffect(() => {
      control.mockTimerPanelMounts = (control.mockTimerPanelMounts ?? 0) + 1
    }, [])
    control.fireTimerComplete = (results: WorkoutResults) =>
      props.onComplete?.('block-1', results)
    return (
      <div
        data-testid="mock-timer-panel"
        data-external-pause={String(props.externalPause ?? false)}
      />
    )
  },
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

mock.module('@/services/resultRecorder', () => ({
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
      ring: { key: 'editor.window', tag: 'Live Editor' },
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
  if (progress < 0.58) {
    const t = (progress - 0.45) / 0.13
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
  if (progress < 0.68) {
    const t = (progress - 0.58) / 0.10
    return {
      index: 4,
      stage: {
        id: 'timer-next',
        screen: 'timer',
        accent: 'hsl(var(--metric-effort))',
        label: 'Advance Rounds with Next',
      },
      t,
      ring: { key: 'timer.nextButton', tag: 'Next Button' },
    }
  }
  const t = (progress - 0.68) / 0.32
  return {
    index: 5,
    stage: {
      id: 'timer-cast',
      screen: 'timer',
      accent: 'hsl(var(--metric-effort))',
      label: 'Cast to the Big Screen',
    },
    t,
    ring: { key: 'timer.castButton', tag: 'Cast' },
  }
}

mock.module('../canvas/useScrollRunway', () => {
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
    useScrollRunway: () => {
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

// Timer-panel access — globalThis is augmented by the RuntimeTimerPanel mock.
type TimerPanelControl = {
  mockTimerPanelMounts?: number
  fireTimerComplete?: (results: WorkoutResults) => void
}
const timerPanelControl = () => globalThis as unknown as TimerPanelControl
const completedResults = (): WorkoutResults =>
  ({
    startTime: 0,
    endTime: 60_000,
    duration: 60_000,
    completed: true,
    logs: [],
  }) as unknown as WorkoutResults

// ── Test data ───────────────────────────────────────────────────────────────

const wodFiles: Record<string, string> = {
  // Real welcome-1.md scaffold (frontmatter stripped): the fence sits on
  // lines 5–11, line-aligned with every adventure preset (#884).
  '../../markdown/canvas/home/welcome-1.md':
    '# 👋 Edit Me\n\nChange the reps, distance, or load below — this is live.\n\n```time\n21-15-9\n  Kettlebell Swings 24kg\n  400m Run\n  Deadlifts 225lb\n  *:30 Rest\n```\n\n> Press **Run** ↑ to start the WallClock.\n',
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

/** The ```scroll:chapters runway spec (six chapter stages → two here). */
const chapterScroll: ScrollSpec = {
  runway: '720vh',
  screen: 'editor',
  typewriter: true,
  stages: [
    { id: 'basics', range: [0, 0.5], screen: 'editor', source: '../../markdown/canvas/home/welcome-1.md', caption: 'Basics blurb.', quest: 'basics-run', ring: { tag: 'Basics example' } },
    { id: 'protocols', range: [0.5, 1], screen: 'editor', source: '../../markdown/canvas/home/welcome-1.md', caption: 'Protocols blurb.', quest: 'protocols-run', ring: { tag: 'Protocols example' } },
  ],
}
async function renderHomeTour() {
  const result = render(
    <MemoryRouter>
      <HomeTour
        wodFiles={wodFiles}
        theme="light"
        quests={homeQuests}
        chapters={chapters}
        chapterScroll={chapterScroll}
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

  it('exposes timer drop-offs with correct hrefs and no analytics caption links', async () => {
    await renderHomeTour()

    // Timer stage is the initial slice.
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    expect(behaviorsLink.getAttribute('href')).toBe('/guide/behaviors')

    // The analytics runway cards are gone; the showcase section sits below the runway.
    expect(screen.queryByTestId('home-analytics-section')).toBeTruthy()

    expect(screen.queryByRole('link', { name: /Run a pre-filled query/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Open the dashboard/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Read the query guide/i })).toBeNull()
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

    // Drive to the timer stage and click the timer drop-off.
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
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
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
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
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
    const hero = within(screen.getByTestId('tour-hero')).getByTestId('mock-note-editor') as HTMLTextAreaElement
    const runway = within(screen.getByTestId('tour-runway')).getByTestId('mock-note-editor') as HTMLTextAreaElement
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
    // The pick replaces the runway demo script with the preset's fence…
    expect(editors[1].value).toContain('21-15-9')
    expect(editors[1].value).toContain('Air Squats')
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

  it('registers the fenced-block highlight region only in the runway window (#884)', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.20)
      await Promise.resolve()
    })

    // The welcome script carries a fence, so the runway editor measures and
    // registers its block region; the hero editor never opts in.
    expect(screen.getAllByTestId('tour-wod-block-region')).toHaveLength(1)

    // Picking an adventure preset keeps exactly one fixed region (the fence
    // is line-aligned across presets, so the box does not move).
    await act(async () => {
      setTestTourProgress(0.05)
      await Promise.resolve()
    })
    const wrapper = screen.getByTestId('tour-workout-choices')
    fireEvent.click(wrapper.querySelector('button')!)
    const option = await screen.findByText('Load & Resistance')
    await act(async () => {
      fireEvent.mouseDown(option)
      await Promise.resolve()
    })
    expect(screen.getAllByTestId('tour-wod-block-region')).toHaveLength(1)
  })

  it('renders the gliding ring with the active stage tag (ring target shape)', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.20)
      await Promise.resolve()
    })

    // slice.ring must reach TourRing as { key, tag } — passing the key string
    // alone silences the ring (regression: desktop ring vanished after the
    // useScrollRunway migration because nothing asserted it).
    const ring = await screen.findByTestId('tour-ring')
    expect(ring.textContent).toContain('Line Metrics')

    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
    })
    await waitFor(() => expect(ring.textContent).toContain('WallClock'))
  })

  it('restarts the run from the timer header Reset button (#885)', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
    })
    await screen.findByTestId('mock-timer-panel')

    const resetButton = await screen.findByRole('button', { name: /Reset timer/i })
    const mountsBefore = timerPanelControl().mockTimerPanelMounts ?? 0
    await act(async () => {
      fireEvent.click(resetButton)
      await Promise.resolve()
    })

    // Reset remounts the panel with a fresh session (auto-start replays).
    expect(timerPanelControl().mockTimerPanelMounts ?? 0).toBeGreaterThan(mountsBefore)
    expect(await screen.findByTestId('mock-timer-panel')).toBeTruthy()
  })

  it('pauses the ambient timer without resetting it when scrolling out of the timer cards (#885)', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
    })
    const panel = await screen.findByTestId('mock-timer-panel')
    expect(panel.getAttribute('data-external-pause')).toBe('false')

    // Scroll out of the timer cards — the same panel stays mounted
    // (no reset) but is signaled to halt.
    await act(async () => {
      setTestTourProgress(0.20)
      await Promise.resolve()
    })
    expect(screen.getByTestId('mock-timer-panel').getAttribute('data-external-pause')).toBe('true')

    // Scroll back up to the editor cards — still halted, still the same run.
    await act(async () => {
      setTestTourProgress(0.20)
      await Promise.resolve()
    })
    expect(screen.getByTestId('mock-timer-panel').getAttribute('data-external-pause')).toBe('true')
  })

  it('carries the visitor to the analytics showcase when Next completes the run (#885)', async () => {
    const scrollIntoViewSpy = mock(() => {})
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as typeof originalScrollIntoView

    try {
      await renderHomeTour()
      // Card 2 of the timer walkthrough — the Next tutorial.
      await act(async () => {
        setTestTourProgress(0.65)
        await Promise.resolve()
      })
      await screen.findByTestId('mock-timer-panel')

      resetScrollSpy()
      await act(async () => {
        timerPanelControl().fireTimerComplete?.(completedResults())
        await Promise.resolve()
      })
      expect(scrollIntoViewSpy).toHaveBeenCalled()
      expect(scrollRunwayToCallCount()).toBe(0)
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('carries the visitor to the analytics showcase from the last timer stage too', async () => {
    const scrollIntoViewSpy = mock(() => {})
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as typeof originalScrollIntoView

    try {
      await renderHomeTour()
      await act(async () => {
        setTestTourProgress(0.50)
        await Promise.resolve()
      })
      await screen.findByTestId('mock-timer-panel')

      // Visitor is on the final timer slide; completing the run still carries
      // them to the WQL showcase below the runway, not to a removed runway card.
      await act(async () => {
        setTestTourProgress(0.83)
        await Promise.resolve()
      })
      resetScrollSpy()
      await act(async () => {
        timerPanelControl().fireTimerComplete?.(completedResults())
        await Promise.resolve()
      })
      expect(scrollIntoViewSpy).toHaveBeenCalled()
      expect(scrollRunwayToCallCount()).toBe(0)
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })
})
