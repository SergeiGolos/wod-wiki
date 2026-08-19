/**
 * HomeTour.ambient.test.tsx — ambient runtime behavior for the redesigned home page.
 *
 * Verifies that the scroll-mode demo auto-advances past the root
 * WaitingToStart gate so the clock never ticks while the label says
 * 'Ready to Start', while playground mode leaves the gate for the visitor.
 */

import { beforeEach, afterEach, describe, expect, it, mock, type Mock } from 'bun:test'
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'

// ── Heavy / browser-only dependencies ───────────────────────────────────────

mock.module('@/components/organisms/editor/NoteEditor', () => ({
  NoteEditor: (props: {
    value?: string
    onChange?: (value: string) => void
    onBlocksChange?: (blocks: ScriptBlock[]) => void
  }) => {
    const React = require('react')
    React.useEffect(() => {
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

type MockHandle = Mock<(event: unknown) => void>

let lastMockRuntime: IScriptRuntime | null = null

function eventNamesFromCalls(handle: MockHandle): string[] {
  return handle.mock.calls.map((call) => {
    const event = call[0]
    if (event && typeof event === 'object' && 'name' in event && typeof event.name === 'string') {
      return event.name
    }
    return ''
  })
}

mock.module('@/components/organisms/editor/RuntimeTimerPanel', () => ({
  RuntimeTimerPanel: ({
    autoStart,
    onRuntimeReady,
    onRunStarted,
  }: {
    block: ScriptBlock | null
    autoStart: boolean
    onClose: () => void
    onComplete: (blockId: string, results: WorkoutResults) => void
    onRuntimeReady: (runtime: IScriptRuntime) => void
    onRunStarted?: () => void
  }) => {
    const React = require('react')
    const startedRef = React.useRef(false)
    React.useEffect(() => {
      if (autoStart && onRunStarted && !startedRef.current) {
        startedRef.current = true
        onRunStarted()
      }
    }, [autoStart, onRunStarted])
    React.useEffect(() => {
      if (!onRuntimeReady) return
      const handle = mock(() => {}) as MockHandle
      const mockRuntime = {
        handle,
        nowProvider: { nowMs: () => Date.now() },
        subscribeToStack: () => () => {},
        subscribeToOutput: () => () => {},
        getOutputStatements: () => [],
        finalizeAnalytics: () => [],
        addOutput: () => {},
        pushBlock: () => {},
        popBlock: () => {},
        do: () => {},
        doAll: () => {},
        dispose: () => {},
        options: {},
        script: {},
        eventBus: { on: () => () => {}, dispatch: () => {} },
        stack: { current: null, count: 0 },
        jit: {},
        clock: { now: new Date(), currentDate: new Date() },
      } as unknown as IScriptRuntime
      lastMockRuntime = mockRuntime
      onRuntimeReady(mockRuntime)
    }, [onRuntimeReady])
    return <div data-testid="mock-timer-panel" data-autostart={String(autoStart)} />
  },
}))

mock.module('./TourTvCard', () => ({
  TourTvCard: () => null,
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
  if (progress < 0.25) {
    const t = progress / 0.25
    return {
      index: 0,
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
  if (progress < 0.5) {
    const t = (progress - 0.25) / 0.25
    return {
      index: 1,
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
  if (progress < 0.75) {
    const t = (progress - 0.5) / 0.25
    return {
      index: 2,
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
  const t = (progress - 0.75) / 0.25
  return {
    index: 3,
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

mock.module('../canvas/useScrollRunway', () => {
  const React = require('react')
  const store: { slice: TestSlice; listeners: Set<() => void> } = {
    slice: makeSlice(0.1),
    listeners: new Set(),
  }

  function setTestTourProgress(progress: number) {
    store.slice = makeSlice(progress)
    store.listeners.forEach((cb) => cb())
  }

  const control = globalThis as unknown as { setTestTourProgressAmbient?: (p: number) => void }
  control.setTestTourProgressAmbient = setTestTourProgress

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
        subscribe: () => () => {},
        resync: () => {},
      }
    },
    scrollRunwayTo: () => {},
  }
})

import { HomeTour } from './HomeTour'

const setTestTourProgress = (progress: number) => {
  const control = globalThis as unknown as { setTestTourProgressAmbient?: (p: number) => void }
  control.setTestTourProgressAmbient?.(progress)
}

// ── Test data ───────────────────────────────────────────────────────────────

const wodFiles: Record<string, string> = {
  'wods/examples/home/welcome-1.md': 'AMRAP 10\n  10 Pull-ups\n  15 Push-ups\n  20 Air Squats\n',
}

const homeQuests: Quest[] = [
  { id: 'qs-arrive', label: 'Welcome to WOD Wiki' },
  { id: 'qs-tour-timer', label: 'See the timer run it', validation: { type: 'run-started' } },
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

const STORAGE_KEY = 'wodwiki.quests.v1'

function seedHomeArrival() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ '/': { 'qs-arrive': true } }))
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
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
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('HomeTour ambient runtime', () => {
  beforeEach(() => {
    lastMockRuntime = null
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
    cleanup()
    window.localStorage.clear()
  })

  it('auto-advances the ambient runtime past the Ready to Start gate', async () => {
    await renderHomeTour()

    await act(async () => {
      setTestTourProgress(0.1)
      await Promise.resolve()
    })

    const timerPanel = await screen.findByTestId('mock-timer-panel')
    expect(timerPanel.getAttribute('data-autostart')).toBe('true')

    await waitFor(() => {
      expect(lastMockRuntime).not.toBeNull()
    })
    expect(eventNamesFromCalls((lastMockRuntime as IScriptRuntime).handle as MockHandle)).toContain('next')
  })

  it('leaves the Ready to Start gate for the user in playground mode', async () => {
    await renderHomeTour()

    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(lastMockRuntime).not.toBeNull()
    })
    expect(eventNamesFromCalls((lastMockRuntime as IScriptRuntime).handle as MockHandle)).not.toContain('next')
  })

  it('does not validate qs-tour-timer from the ambient scroll auto-start', async () => {
    seedHomeArrival()
    await renderHomeTour()

    await act(async () => {
      setTestTourProgress(0.1)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(lastMockRuntime).not.toBeNull()
    })

    // qs-arrive is complete (seeded), qs-tour-timer must NOT validate from ambient auto-start.
    const ledger = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(ledger['/']?.['qs-arrive']).toBe(true)
    expect(ledger['/']?.['qs-tour-timer']).toBeUndefined()
  })

  it('validates qs-tour-timer when the hero Run button starts a playground run', async () => {
    seedHomeArrival()
    await renderHomeTour()

    const runButton = await within(screen.getByTestId('tour-hero')).findByRole('button', { name: /^Run$/i })
    await act(async () => {
      fireEvent.click(runButton)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('tour-playground-overlay')).not.toBeNull()
    })

    // qs-tour-timer validated by the visitor-initiated hero Run (asserted via ledger below).
    const ledger = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(ledger['/']?.['qs-arrive']).toBe(true)
    expect(ledger['/']?.['qs-tour-timer']).toBe(true)
  })
})
