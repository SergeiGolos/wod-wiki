/**
 * HomeTour.test.tsx — route-level component test for the home page.
 *
 * Asserts the four tagged runway sections (write / run / own / explore), the
 * jump section exits, the chapter picker, per-stage drop-off hrefs, and the
 * telemetry funnel events. Runs are INLINE (no fullscreen overlay): a fresh
 * playground run identity is minted per explicit Run / stage-entrance
 * autostart, saved exactly once, and the explore table is scoped to the
 * run's note.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NuqsAdapter } from 'nuqs/adapters/react-router'
import type { Quest, Chapter, ScrollStage } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock, Sessions } from '@/components/Editor/types'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'

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
    autoStart?: boolean
    onComplete?: (blockId: string, results: Sessions) => void
    onRunStarted?: () => void
    externalStop?: boolean
  }) => {
    const control = globalThis as unknown as {
      mockTimerPanelMounts?: number
      fireTimerComplete?: (results: Sessions) => void
    }
    const React = require('react')
    React.useEffect(() => {
      control.mockTimerPanelMounts = (control.mockTimerPanelMounts ?? 0) + 1
      // Model the real panel: autoStart begins execution → idle→running.
      if (props.autoStart) props.onRunStarted?.()
    }, [])
    // Model the real panel's host-driven stop: flipping externalStop halts
    // the live execution and reports the partial once.
    React.useEffect(() => {
      if (props.externalStop) {
        props.onComplete?.('block-1', {
          startTime: 0,
          endTime: 30_000,
          duration: 30_000,
          completed: false,
          logs: [{ outputType: 'segment' }],
        } as unknown as Sessions)
      }
    }, [props.externalStop])
    control.fireTimerComplete = (results: Sessions) =>
      props.onComplete?.('block-1', results)
    return (
      <div
        data-testid="mock-timer-panel"
        data-external-stop={String(props.externalStop ?? false)}
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

mock.module('@/components/organisms/analytics', () => ({
  ParsedQueryChips: () => null,
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

// ── usePlaygroundRun mock — the shared lifecycle contract ───────────────────

type RunControl = {
  run: { noteId: string; resultId: string; block: ScriptBlock } | null
  starts: number
  finalizes: Array<{ results: Sessions; completed: boolean }>
  resets: number
  ends: number
  failStarts: boolean
  recorded: boolean
}
const runControl: RunControl = {
  run: null,
  starts: 0,
  finalizes: [],
  resets: 0,
  ends: 0,
  failStarts: false,
  recorded: false,
}

mock.module('../hooks/usePlaygroundRun', () => ({
  usePlaygroundRun: () => ({
    get run() {
      return runControl.run
    },
    start: mock(async (doc: string, block: ScriptBlock) => {
      if (runControl.failStarts) throw new Error('storage blocked')
      runControl.starts += 1
      runControl.run = { noteId: `note-${runControl.starts}`, resultId: `res-${runControl.starts}`, block }
      runControl.recorded = false
      return runControl.run
    }),
    finalize: mock(async (results: Sessions, completed: boolean) => {
      // Record-exactly-once, mirroring the real hook.
      if (runControl.recorded) return
      runControl.recorded = true
      runControl.finalizes.push({ results, completed })
    }),
    reset: mock(async () => {
      runControl.resets += 1
      runControl.run = null
    }),
    end: mock(async () => {
      runControl.ends += 1
      runControl.run = null
    }),
  }),
}))

// The explore table pane executes WQL against the store; in tests the store
// is unavailable — the pane must degrade to its empty/sample affordances
// while still issuing the (note-scoped) query.
const queryCalls: string[] = []
mock.module('@/services/queryService', () => ({
  queryService: {
    runQuery: mock(async (q: string) => {
      queryCalls.push(q)
      throw new Error('no store in tests')
    }),
  },
}))

mock.module('@/services/analytics/sample', () => ({
  hasSampleData: async () => false,
  loadSampleData: async () => ({ facts: 0 }),
  purgeSampleData: async () => {},
}))

mock.module('@/services/content/seedContent', () => ({
  useSeedContent: () => null,
}))

mock.module('../../views/dashboards/WidgetComposerDialog', () => ({
  WidgetComposerDialog: () => null,
}))

const toastMock = mock((..._args: unknown[]) => {})
mock.module('@/hooks/use-toast', () => ({
  toast: toastMock,
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

mock.module('../canvas/useScrollRunway', () => {
  const React = require('react')
  const store = {
    progress: 0.5,
    listeners: new Set<() => void>(),
  }

  function sliceFor(stages: ScrollStage[], progress: number) {
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
        ring: stage.ring,
      },
      t: 0.5,
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
    useScrollRunway: (_ref: unknown, _frozen: boolean, stages: ScrollStage[]) => {
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
import { NavContext, initialNavState } from '../nav/NavContext'
import type { NavItemL3 } from '../nav/navTypes'

// jsdom lacks ResizeObserver; Headless UI's combobox machine touches it when
// the option list closes after a selection.
const globalWithResizeObserver = globalThis as unknown as { ResizeObserver?: unknown }
globalWithResizeObserver.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const setTestTourProgress = (progress: number) => {
  const control = globalThis as unknown as { setTestTourProgress?: (p: number) => void }
  control.setTestTourProgress?.(progress)
}

type ScrollSpy = { scrollRunwayToCalls?: number }
const scrollSpyControl = () => globalThis as unknown as ScrollSpy
const resetScrollSpy = () => {
  scrollSpyControl().scrollRunwayToCalls = 0
}
const scrollRunwayToCallCount = () => scrollSpyControl().scrollRunwayToCalls ?? 0

type TimerPanelControl = {
  mockTimerPanelMounts?: number
  fireTimerComplete?: (results: Sessions) => void
}
const timerPanelControl = () => globalThis as unknown as TimerPanelControl
const completedResults = (): Sessions =>
  ({
    startTime: 0,
    endTime: 60_000,
    duration: 60_000,
    completed: true,
    logs: [{ outputType: 'segment' }],
  }) as unknown as Sessions

// ── Test data ───────────────────────────────────────────────────────────────

const BARE_WELCOME = '```time\n0:03 Count Down\n10 Pushups\n```'
const PROTOCOLS_EXAMPLE = '```time\n5:00 Run\n*:30 Rest\n10 Burpees\n```'

const wodFiles: Record<string, string> = {
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

/** Timer-backed delay (Promise.withResolvers form). */
const delay = (ms: number) => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

async function renderHomeTour() {
  const result = render(
    <MemoryRouter>
      <NuqsAdapter>
        <HomeTour
          wodFiles={wodFiles}
          theme="light"
          quests={homeQuests}
          chapters={chapters}
        />
      </NuqsAdapter>
    </MemoryRouter>,
  )
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

/** Drives to the run section's timer stage and waits out the dwell autostart. */
async function driveToTimerStageAndAutostart() {
  await act(async () => {
    setTestTourProgress(0.50)
    await Promise.resolve()
  })
  // The stage-entrance autostart dwells 400ms before minting the run.
  await act(async () => {
    await delay(450)
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('HomeTour', () => {
  let recorded: Array<{ name: string; payload?: Record<string, unknown> }> = []
  let unsubscribe: () => void = () => {}

  beforeEach(() => {
    setTestTourProgress(0.50)
    resetScrollSpy()
    recorded = []
    queryCalls.length = 0
    runControl.run = null
    runControl.starts = 0
    runControl.finalizes = []
    runControl.resets = 0
    runControl.ends = 0
    runControl.failStarts = false
    runControl.recorded = false
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
    // The Feeds destination is live — no stale "work in progress" label.
    expect(jump.textContent?.toLowerCase()).not.toContain('work in progress')

    const libraryLink = within(jump).getByTestId('jump-library')
    expect(libraryLink.getAttribute('href')).toBe('/collections')

    expect(within(jump).getByTestId('jump-new-note')).toBeTruthy()
  })

  it('exposes timer drop-offs with correct hrefs', async () => {
    await renderHomeTour()

    // Native caption flow renders the write captions in sequence — several
    // stages share the clock drop-off, so assert across all of them.
    const clockLinks = await screen.findAllByRole('link', { name: /Read the behaviors explainer/i })
    expect(clockLinks.length).toBeGreaterThan(0)
    for (const link of clockLinks) {
      expect(link.getAttribute('href')).toBe('/guide/clock#run-next')
    }
  })

  it('renders the page structure — four tagged runways in walkthrough order', async () => {
    await renderHomeTour()

    expect(screen.getByTestId('tour-jump-section')).toBeTruthy()
    expect(screen.queryByTestId('tour-registry')).toBeNull()
    expect(screen.queryByTestId('tour-reference')).toBeNull()

    const headings = (await screen.findAllByRole('heading')).map((h) => h.textContent ?? '')
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

  it('never renders the fullscreen playground overlay on any path', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()

    // The run is inline in the run section — no overlay exists anywhere.
    expect(screen.queryByTestId('tour-playground-overlay')).toBeNull()
    expect(screen.getByTestId('mock-timer-panel')).toBeTruthy()
  })

  it('autostarts the run once per identity on timer-stage dwell', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()

    expect(runControl.starts).toBe(1)
    expect(runControl.run?.noteId).toBe('note-1')

    // Backward/forward re-entry never re-runs the settled identity.
    await act(async () => {
      setTestTourProgress(0.10)
      await Promise.resolve()
    })
    await act(async () => {
      setTestTourProgress(0.50)
      await Promise.resolve()
      await delay(450)
    })
    expect(runControl.starts).toBe(1)
  })

  it('publishes a stop-the-timer outline button on the metrics row only while a run is live', async () => {
    const published: NavItemL3[][] = []
    render(
      <MemoryRouter>
        <NuqsAdapter>
          <NavContext.Provider
            value={{
              tree: [],
              navState: initialNavState,
              dispatch: () => {},
              l3Items: [],
              setL3Items: (items) => {
                published.push(items)
              },
              secondarySpec: undefined,
              setSecondarySpec: () => {},
              scrollToSection: () => {},
              registerScrollFn: () => {},
            }}
          >
            <HomeTour wodFiles={wodFiles} theme="light" quests={homeQuests} chapters={chapters} />
          </NavContext.Provider>
        </NuqsAdapter>
      </MemoryRouter>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    const lastOutline = () => published[published.length - 1] ?? []
    expect(lastOutline().find((i) => i.id === 'own')?.secondaryAction).toBeUndefined()

    await driveToTimerStageAndAutostart()
    await act(async () => {
      await Promise.resolve()
    })
    const own = lastOutline().find((i) => i.id === 'own')
    expect(own?.secondaryAction?.id).toBe('run-stop')
    expect(own?.secondaryRunIcon).toBe('stop')
  })

  it('does not start a hidden run when the visitor blows past the timer stages', async () => {
    // Stub IntersectionObserver: leaving the run section's viewport before
    // the dwell completes must clear the pending autostart — no hidden run.
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
        setTestTourProgress(0.10)
        await Promise.resolve()
      })
      // Blow past: the run section's viewport releases within the dwell
      // window (real fast scroll) — the pending autostart is cleared.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(false)
        }
        await Promise.resolve()
      })
      await act(async () => {
        await delay(500)
      })
      expect(runControl.starts).toBe(0)
    } finally {
      delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver
    }
  })

  it('hero Run persists a fresh note and runs in place — no scrolling', async () => {
    await renderHomeTour()
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: 'Run' })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    // Fresh identity minted in place — save-first contract, no glide.
    expect(runControl.starts).toBe(1)
    expect(runControl.run?.noteId).toBe('note-1')
    expect(scrollRunwayToCallCount()).toBe(0)
    // The timer pane mounts in the hero viewport; the run section yields
    // its pane so the identity never executes twice.
    expect(within(screen.getByTestId('tour-hero')).getByTestId('mock-timer-panel')).toBeTruthy()
    expect(screen.getAllByTestId('mock-timer-panel')).toHaveLength(1)
  })

  it('every explicit Run after a recorded run mints a NEW note', async () => {
    await renderHomeTour()
    const hero = () => screen.getByTestId('tour-hero')
    const runButton = await within(hero()).findByRole('button', { name: 'Run' })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })
    expect(runControl.starts).toBe(1)

    // The first run completes and is recorded — the hero settles on the
    // in-place result view…
    await act(async () => {
      timerPanelControl().fireTimerComplete?.(completedResults())
      await Promise.resolve()
    })
    expect(runControl.finalizes).toHaveLength(1)
    expect(within(hero()).getByTestId('tour-session-result')).toBeTruthy()

    // …and after dismissing back to the editor, the next Run mints a fresh
    // identity (second note), not a reuse.
    await act(async () => {
      fireEvent.click(within(hero()).getByTestId('tour-session-result-dismiss'))
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(within(hero()).getByRole('button', { name: 'Run' }))
      await Promise.resolve()
    })
    expect(runControl.starts).toBe(2)
    expect(runControl.run?.noteId).toBe('note-2')
  })

  it('records completion against the run identity exactly once', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()
    expect(runControl.starts).toBe(1)

    await act(async () => {
      timerPanelControl().fireTimerComplete?.(completedResults())
      // A duplicate completion report (Stop after natural complete) must be
      // absorbed by the record-once guard.
      timerPanelControl().fireTimerComplete?.(completedResults())
      await Promise.resolve()
    })

    expect(runControl.finalizes).toHaveLength(1)
    expect(runControl.finalizes[0]).toMatchObject({ completed: true })
  })

  it('aborts the run with a toast when the note cannot be persisted', async () => {
    runControl.failStarts = true
    await renderHomeTour()
    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: 'Run' })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    // No identity, no scroll onto the stage, and the failure is visible.
    expect(runControl.starts).toBe(0)
    expect(runControl.run).toBeNull()
    expect(scrollRunwayToCallCount()).toBe(0)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
  })

  it('shows the one shared document in both the hero and write displays', async () => {
    await renderHomeTour()
    // The hero view hosts a live editor at first paint; the write section's
    // sticky pane is a second display of the SAME doc state — no reset at
    // the boundary between them.
    const heroEditor = within(screen.getByTestId('tour-hero')).getByTestId('mock-note-editor') as HTMLTextAreaElement
    const writeSection = screen.getByTestId('tour-section-write')
    const writeEditor = within(writeSection).getByTestId('mock-note-editor') as HTMLTextAreaElement
    expect(writeEditor.value).toBe(heroEditor.value)

    await act(async () => {
      fireEvent.change(heroEditor, { target: { value: 'EDIT IN HERO' } })
      await Promise.resolve()
    })
    expect(writeEditor.value).toBe('EDIT IN HERO')
  })

  it('offers workout presets that replace the shared document', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.05)
      await Promise.resolve()
    })
    const input = await screen.findByRole('combobox', { name: /load a workout into the demo/i })
    expect(input).toBeTruthy()

    const wrapper = screen.getByTestId('tour-workout-choices')
    const toggle = wrapper.querySelector('button')
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle!)

    const option = await screen.findByText('21-15-9 Rep Scaling')
    await act(async () => {
      fireEvent.mouseDown(option)
      await Promise.resolve()
    })

    // The pick replaces the one shared document — the single write editor
    // shows the preset.
    const editors = screen.getAllByTestId('mock-note-editor') as HTMLTextAreaElement[]
    expect(editors[0].value).toContain('21-15-9')
  })

  it('registers the fenced-block highlight region only in the runway window (#884)', async () => {
    await renderHomeTour()
    await act(async () => {
      setTestTourProgress(0.20)
      await Promise.resolve()
    })

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

  it('restarts the run from the timer header Reset button (#885)', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()
    await screen.findByTestId('mock-timer-panel')

    const resetButton = await screen.findByRole('button', { name: /Reset timer/i })
    const mountsBefore = timerPanelControl().mockTimerPanelMounts ?? 0
    await act(async () => {
      fireEvent.click(resetButton)
      await Promise.resolve()
    })

    // Reset finalizes the live partial (completed:false) and remounts the
    // pane on a fresh unstarted snapshot.
    expect(runControl.resets).toBe(1)
    expect(timerPanelControl().mockTimerPanelMounts ?? 0).toBeGreaterThan(mountsBefore)
  })

  it('saves the partial exactly once when the run section scrolls out of view', async () => {
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
        entry.fire(true)
      }
      unobserve() {}
      disconnect() {}
    }
    const globalScope = globalThis as unknown as Record<string, unknown>
    globalScope.IntersectionObserver = MockIO

    try {
      await renderHomeTour()
      await driveToTimerStageAndAutostart()
      expect(runControl.starts).toBe(1)

      // Leave the run section's viewport — the live execution is halted
      // (externalStop) and the partial is recorded exactly once.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(false)
        }
        await Promise.resolve()
      })
      await waitFor(() => expect(runControl.finalizes).toHaveLength(1))
      expect(runControl.finalizes[0]).toMatchObject({ completed: false })

      // Re-entering never re-runs the settled identity.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(true)
        }
        await Promise.resolve()
        await delay(450)
      })
      expect(runControl.starts).toBe(1)
    } finally {
      delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver
    }
  })

  it('records completion in place — the visitor is never pulled elsewhere', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()
    await screen.findByTestId('mock-timer-panel')

    resetScrollSpy()
    await act(async () => {
      timerPanelControl().fireTimerComplete?.(completedResults())
      await Promise.resolve()
    })
    // No slide to the metrics section; the result settles where the run ran.
    expect(scrollRunwayToCallCount()).toBe(0)
    expect(runControl.finalizes).toHaveLength(1)
  })

  it('stops a live hero run on metrics arrival and shows the recorded $session segments', async () => {
    // Stub IntersectionObserver so the test can toggle the run section's
    // viewport signal — leaving it is what "arriving at Own-the-Metrics"
    // means on the real page.
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
        entry.fire(true)
      }
      unobserve() {}
      disconnect() {}
    }
    const globalScope = globalThis as unknown as Record<string, unknown>
    globalScope.IntersectionObserver = MockIO

    try {
      await renderHomeTour()
      const hero = () => screen.getByTestId('tour-hero')
      await act(async () => {
        fireEvent.click(within(hero()).getByRole('button', { name: 'Run' }))
        await Promise.resolve()
      })
      expect(within(hero()).getByTestId('mock-timer-panel')).toBeTruthy()

      // Scroll past the run section into Own-the-Metrics — the live runtime
      // is stopped and its partial recorded.
      await act(async () => {
        for (const o of observers) {
          if (o.el instanceof HTMLElement && o.el.closest('[data-testid="tour-section-run"]')) o.fire(false)
        }
        setTestTourProgress(0.90)
        await Promise.resolve()
      })
      await waitFor(() => expect(runControl.finalizes).toHaveLength(1))
      // The hero settles on the in-place result view…
      expect(within(hero()).getByTestId('tour-session-result')).toBeTruthy()
      // …and the metrics section pane answers with the recorded segments
      // instead of the WQL table.
      const own = screen.getByTestId('tour-section-own')
      expect(within(own).getByTestId('tour-session-result')).toBeTruthy()
    } finally {
      delete globalScope.IntersectionObserver
    }
  })

  it('scopes the explore WQL table to the current run note', async () => {
    await renderHomeTour()
    await driveToTimerStageAndAutostart()
    expect(runControl.run?.noteId).toBe('note-1')

    // Drive to the explore section's table beat — the pane's query must be
    // filtered to the run's note identity.
    await act(async () => {
      setTestTourProgress(0.30)
      await Promise.resolve()
    })
    await waitFor(() => expect(queryCalls.length).toBeGreaterThan(0))
    expect(queryCalls.some((q) => q.includes('note:note-1'))).toBe(true)
  })

  it('scopes explore queries AST-safely — empty and preset filters parse with the real parser', async () => {
    const { parseQuery } = require('@bitcobblers/wod-wiki-engine')
    const { scopeQueryToNote } = require('./screens/TourSessionAnalytics')
    const noteId = '01a108c8-ad19-7004-81c1-e737f63f2350'

    // Empty filter braces: no trailing comma.
    const empty = scopeQueryToNote('sum:totalReps{} by {effort}', noteId)
    expect(empty).toBe(`sum:totalReps{note:${noteId}} by {effort}`)
    expect(parseQuery(empty).filters.map((f: { key: string }) => f.key)).toEqual(['note'])

    // Existing filters merge before the original keys, comma-separated.
    const preset = scopeQueryToNote('sum:totalVolume{discipline:strength} by {week}', noteId)
    expect(parseQuery(preset).filters.map((f: { key: string }) => f.key)).toEqual(['note', 'discipline'])

    // Window suffix survives.
    expect(scopeQueryToNote('avg:tis{} last 6w', noteId)).toBe(`avg:tis{note:${noteId}} last 6w`)
  })

  it('chapter picker loads examples into the shared editor and links out to guides', async () => {
    await renderHomeTour()
    const picker = screen.getByTestId('tour-chapter-picker')

    fireEvent.click(within(picker).getByTestId('chapter-picker-select-protocols'))
    const pickerEditors = within(picker).getAllByTestId('mock-note-editor') as HTMLTextAreaElement[]
    expect(pickerEditors).toHaveLength(1)
    await waitFor(() => {
      expect(pickerEditors[0].value).toContain('Burpees')
    })

    const guideLink = within(picker).getByTestId('chapter-picker-guide-protocols')
    expect(guideLink.getAttribute('href')).toBe('/guide/protocols')
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
