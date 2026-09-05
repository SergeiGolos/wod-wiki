/**
 * HomeTour.test.tsx — route-level component test for the redesigned home page.
 *
 * Asserts the four tagged runway sections (write / run / own / explore), the
 * jump section exits, the chapter picker, per-stage drop-off hrefs, and the
 * telemetry funnel events. The retired single 1300vh runway, Movement
 * Registry strip, Quick Reference, and telemetry footer are gone.
 */

import { beforeEach, afterEach, describe, expect, it, mock, type Mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { ScrollStage } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { ensurePlaygroundEntry } from '../services/createPlaygroundPage'

// ── Heavy / browser-only dependencies ───────────────────────────────────────

mock.module('@/components/organisms/editor/NoteEditor', () => ({
  NoteEditor: (props: {
    value?: string
    onChange?: (value: string) => void
    onBlocksChange?: (blocks: ScriptBlock[]) => void
    onStartWorkout?: (block: ScriptBlock) => void
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
        {props.onStartWorkout && (
          <button onClick={() => props.onStartWorkout?.({ id: 'block-1' } as unknown as ScriptBlock)}>Run</button>
        )}
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

const recordedResults: Array<Record<string, unknown>> = []
mock.module('@/services/resultRecorder', () => ({
  playgroundRecorder: {
    record: async (input: Record<string, unknown>) => {
      recordedResults.push(input)
    },
  },
}))

const toastMock = mock((..._args: unknown[]) => {})
mock.module('@/hooks/use-toast', () => ({
  toast: toastMock,
}))

const ensureEntryCalls: Array<{ content: string; opts?: unknown }> = []
mock.module('../services/createPlaygroundPage', () => ({
  ensurePlaygroundEntry: mock(async (content: string, opts?: unknown) => {
    ensureEntryCalls.push({ content, opts })
    return { noteId: 'playground-note-test', routeId: 'playground/test' }
  }),
  createPlaygroundPage: mock(async () => 'test-page'),
  movePlaygroundToJournal: mock(async (noteId: string) => ({ id: noteId })),
}))

mock.module('@/services/AnalyticsTransformer', () => ({
  getAnalyticsFromLogs: () => ({ segments: [{ id: 'seg-1' }], groups: [] }),
  getAnalyticsFromRuntime: () => ({ segments: [], groups: [] }),
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

// ── useScrollRunway mock — section-aware, driven by one global progress ──────
//
// Each TourSectionRunway registers the stages it was mounted with (keyed by
// first stage id); one global progress resolves every section's slice against
// its OWN stage list, mirroring how the real page partitions the canonical
// runway across four independent drivers.

type TestSlice = {
  index: number
  stage: { id: string; screen: string; accent?: string; label?: string }
  t: number
  ring: { key?: string; tag?: string; lines?: [number, number] } | true | null
}

mock.module('../canvas/useScrollRunway', () => {
  const React = require('react')
  const store = {
    progress: 0.5,
    sections: new Map<string, ScrollStage[]>(),
    listeners: new Set<() => void>(),
  }

  function sliceFor(stages: ScrollStage[], progress: number): TestSlice {
    const len = Math.max(1, stages.length)
    const index = Math.min(len - 1, Math.floor(progress * len))
    const stage = stages[index]!
    return {
      index,
      stage: {
        id: stage.id,
        screen: String(stage.screen),
        accent: stage.accent,
        label: stage.label,
      },
      t: 0.5,
      ring: stage.ring ?? null,
    }
  }

  function emit() {
    store.listeners.forEach((cb) => cb())
  }

  function setTestTourProgress(progress: number) {
    store.progress = progress
    emit()
  }

  const control = globalThis as unknown as {
    setTestTourProgress?: (p: number) => void
    scrollRunwayToCalls?: number
  }
  control.setTestTourProgress = setTestTourProgress

  return {
    useScrollRunway: (_ref: unknown, _interactive: boolean, stages: ScrollStage[]) => {
      const key = stages[0]?.id ?? 'default'
      store.sections.set(key, stages)
      const [, force] = React.useReducer((n: number) => n + 1, 0)
      React.useEffect(() => {
        store.listeners.add(force)
        return () => {
          store.listeners.delete(force)
        }
      }, [])
      return {
        slice: sliceFor(stages, store.progress),
        progress: store.progress,
        runwayReached: true,
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
  // globalThis is augmented by the useScrollRunway mock factory at runtime.
  const control = globalThis as unknown as { setTestTourProgress?: (p: number) => void }
  control.setTestTourProgress?.(progress)
}

// Scroll-spy access — globalThis is augmented by the useScrollRunway mock factory.
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

const BARE_WELCOME = '```time\n0:03 Count Down\n10 Pushups\n```'
const PROTOCOLS_EXAMPLE = '```time\n5:00 Run\n*:30 Rest\n10 Burpees\n```'

const wodFiles: Record<string, string> = {
  // welcome-1.md is bare markdown now — the wrapper text is created only on
  // the /load?z= route (buildSharedScript), never by default '/'.
  '../../markdown/canvas/home/welcome-1.md': BARE_WELCOME,
  '../../markdown/canvas/syntax/timers-rest.md': PROTOCOLS_EXAMPLE,
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
    recordedResults.length = 0
    ensureEntryCalls.length = 0
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

  it('renders the jump section with feeds, collections, and journal exits', async () => {
    await renderHomeTour()
    const jump = await screen.findByTestId('tour-jump-section')
    expect(jump).toBeTruthy()

    const feedsLink = within(jump).getByTestId('jump-feeds')
    expect(feedsLink.getAttribute('href')).toBe('/feeds')
    expect(jump.textContent).toContain('Work in progress')

    const libraryLink = within(jump).getByTestId('jump-library')
    expect(libraryLink.getAttribute('href')).toBe('/collections')

    expect(within(jump).getByTestId('jump-new-note')).toBeTruthy()
  })

  it('exposes timer drop-offs with correct hrefs and no analytics caption links', async () => {
    await renderHomeTour()

    // Timer stage is the initial slice of the run section.
    const behaviorsLink = await screen.findByRole('link', { name: /Read the behaviors explainer/i })
    expect(behaviorsLink.getAttribute('href')).toBe('/guide/behaviors')

    // The standalone analytics section is gone; the WQL showcase renders
    // inside the explore section window once the analytics beats are entered.
    expect(screen.queryByTestId('home-analytics-section')).toBeNull()
    await act(async () => {
      setTestTourProgress(0.68)
      await Promise.resolve()
    })
    expect(await screen.findByTestId('tour-analytics-showcase')).toBeTruthy()

    expect(screen.queryByRole('link', { name: /Run a pre-filled query/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Open the dashboard/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Read the query guide/i })).toBeNull()
  })

  it('renders the redesigned page structure — registry, reference, and footer removed', async () => {
    await renderHomeTour()

    expect(screen.queryByTestId('tour-short-circuit-strip')).toBeNull()
    expect(screen.getByTestId('tour-jump-section')).toBeTruthy()
    expect(screen.queryByTestId('tour-registry')).toBeNull()
    expect(screen.queryByTestId('tour-reference')).toBeNull()

    const headings = (await screen.findAllByRole('heading')).map((h) => h.textContent ?? '')
    expect(headings.some((t) => t.includes('The Movement Registry'))).toBe(false)
    expect(headings.some((t) => t.includes('Quick Reference'))).toBe(false)

    // One tagline header per tagged section, in walkthrough order.
    const order = ['Write it in', 'Run it as a', 'Own the', 'your analytics']
    let cursor = -1
    for (const fragment of order) {
      const idx = headings.findIndex((t, i) => i > cursor && t.includes(fragment))
      expect(idx).toBeGreaterThan(cursor)
      cursor = idx
    }

    expect(screen.getByTestId('tour-chapter-picker')).toBeTruthy()
    expect(screen.getAllByTestId('tour-runway')).toHaveLength(4)
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

    const libraryLink = await screen.findByTestId('jump-library')
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

  it('desktop hero Run mounts the fullscreen overlay with Clock and exit pill', async () => {
    await renderHomeTour()
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    // The fullscreen overlay mounts above the ambient runway demo.
    const overlay = await screen.findByTestId('tour-playground-overlay')
    expect(overlay).toBeTruthy()

    // The mocked RuntimeTimerPanel (Clock) renders inside the overlay.
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

  it('persists the home playground entry before running and records completion against its UUID', async () => {
    await renderHomeTour()
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
      await Promise.resolve()
    })

    // The entry was persisted (with the hero's current doc) before the
    // overlay could open…
    expect(ensureEntryCalls).toHaveLength(1)
    expect(ensureEntryCalls[0]!.opts).toEqual({ reuseKey: 'home', title: 'Home playground' })
    const overlay = await screen.findByTestId('tour-playground-overlay')
    expect(overlay).toBeTruthy()

    // …and completion records the result against the entry's Note UUID as a
    // playground-origin result — no journal note is created.
    await act(async () => {
      timerPanelControl().fireTimerComplete?.(completedResults())
      await Promise.resolve()
    })
    await waitFor(() => expect(recordedResults).toHaveLength(1))
    expect(recordedResults[0]).toMatchObject({
      noteId: 'playground-note-test',
      origin: 'playground',
    })
    // The recorder is the ONLY persistence write on completion.
    expect(recordedResults).toHaveLength(1)
  })

  it('aborts the run with a toast when the playground entry cannot be persisted', async () => {
    const ensureMock = ensurePlaygroundEntry as unknown as Mock<
      (content: string, opts?: unknown) => Promise<unknown>
    >
    ensureMock.mockImplementation(() => Promise.reject(new Error('storage blocked')))
    try {
      await renderHomeTour()
      const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
      await act(async () => {
        fireEvent.click(runButton)
        await Promise.resolve()
        await Promise.resolve()
      })

      // No runtime execution without persistence…
      expect(screen.queryByTestId('tour-playground-overlay')).toBeNull()
      // …and the failure is visible.
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    } finally {
      ensureMock.mockImplementation(() =>
        Promise.resolve({ noteId: 'playground-note-test', routeId: 'playground/test' }),
      )
    }
  })

  it('keeps the hero editor and the runway editor independent', async () => {
    await renderHomeTour()
    const hero = within(screen.getByTestId('tour-hero')).getByTestId('mock-note-editor') as HTMLTextAreaElement
    const writeSection = screen.getByTestId('tour-section-write')
    const runway = within(writeSection).getByTestId('mock-note-editor') as HTMLTextAreaElement
    // Same arrival content (bare markdown), separate documents.
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
    // (editors[1] is the write section's ambient window — DOM order puts the
    // hero first, the write section second, and the chapter picker last.)
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

    // The picker lives in the write section's caption column…
    const captions = within(screen.getByTestId('tour-section-write')).getByTestId('tour-captions')
    expect(
      within(captions).getByRole('combobox', { name: /load a workout into the demo/i }),
    ).toBeTruthy()
    // …and never in an editor window (#883) — no sub-bar header exists.
    expect(screen.queryByTestId('tour-editor-header')).toBeNull()
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
      // 1/3 ≤ p < 2/3 → the write section sits on editor-metrics.
      setTestTourProgress(0.40)
      await Promise.resolve()
    })

    // slice.ring must reach TourRing as { key, tag } — passing the key string
    // alone silences the ring (regression: desktop ring vanished after the
    // useScrollRunway migration because nothing asserted it). Each section
    // owns a ring, so assert across all of them.
    let rings = await screen.findAllByTestId('tour-ring')
    expect(rings.some((r) => r.textContent?.includes('Line Metrics'))).toBe(true)

    await act(async () => {
      // p < 1/3 → the run section sits on timer-wallclock.
      setTestTourProgress(0.30)
      await Promise.resolve()
    })
    await waitFor(() => {
      rings = screen.getAllByTestId('tour-ring')
      expect(rings.some((r) => r.textContent?.includes('Clock'))).toBe(true)
    })
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

  it('pauses the ambient timer without resetting it when the run section leaves the viewport (#885)', async () => {
    // Stub IntersectionObserver so the test can toggle the run section's
    // viewport signal directly.
    type MockEntry = { el: Element; fire: (v: boolean) => void }
    const observers: MockEntry[] = []
    class MockIO {
      cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      observe(el: Element) {
        const entry = {
          el,
          fire: (v: boolean) =>
            this.cb([{ isIntersecting: v } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver),
        }
        observers.push(entry)
        // Real IO reports initial state asynchronously; do it synchronously.
        entry.fire(true)
      }
      unobserve() {}
      disconnect() {}
    }
    const globalScope = globalThis as unknown as Record<string, unknown>
    globalScope.IntersectionObserver = MockIO

    try {
      await renderHomeTour()
      await act(async () => {
        setTestTourProgress(0.50)
        await Promise.resolve()
      })
      const panel = await screen.findByTestId('mock-timer-panel')
      expect(panel.getAttribute('data-external-pause')).toBe('false')

      // Leave the run section's viewport — same panel stays mounted (no
      // reset) but is signaled to halt.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(false)
        }
        await Promise.resolve()
      })
      expect(screen.getByTestId('mock-timer-panel').getAttribute('data-external-pause')).toBe('true')

      // Re-entering releases the halt on the same run.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(true)
        }
        await Promise.resolve()
      })
      expect(screen.getByTestId('mock-timer-panel').getAttribute('data-external-pause')).toBe('false')
    } finally {
      delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver
    }
  })

  it('carries the visitor to the Own-the-Metrics section when Next completes the run (#885)', async () => {
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
      expect(scrollIntoViewSpy).not.toHaveBeenCalled()
      // The completion slides onward via the metrics section's scrollToStage.
      expect(scrollRunwayToCallCount()).toBe(1)
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('chapter picker loads examples into the shared editor and links out to guides', async () => {
    await renderHomeTour()
    const picker = screen.getByTestId('tour-chapter-picker')

    // Primary select loads the chapter example into the ONE shared editor…
    fireEvent.click(within(picker).getByTestId('chapter-picker-select-protocols'))
    const pickerEditors = within(picker).getAllByTestId('mock-note-editor') as HTMLTextAreaElement[]
    expect(pickerEditors).toHaveLength(1)
    await waitFor(() => {
      expect(pickerEditors[0].value).toContain('Burpees')
    })

    // …the smaller link-out goes to the guide docs for the chapter.
    const guideLink = within(picker).getByTestId('chapter-picker-guide-protocols')
    expect(guideLink.getAttribute('href')).toBe('/guide/syntax/protocols')
    fireEvent.click(guideLink)
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.chapterGuideClicked)
  })

  it('hero title highlights jump to each walkthrough section on click', async () => {
    const scrollIntoViewSpy = mock(() => {})
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as typeof originalScrollIntoView

    try {
      await renderHomeTour()

      const sections = ['write', 'run', 'own', 'explore']
      for (const sec of sections) {
        scrollIntoViewSpy.mockClear()
        const btn = screen.getByTestId(`hero-tagline-${sec}`)
        expect(btn).toBeTruthy()
        fireEvent.click(btn)
        expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
      }
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })
})
