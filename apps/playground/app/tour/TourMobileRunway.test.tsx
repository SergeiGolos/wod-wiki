/**
 * TourMobileRunway.test.tsx — mobile per-chapter sticky-runway contracts:
 * the hero is its own normal-flow view (editor at first paint), every
 * chapter set owns a bounded sticky window pinned inside its own section
 * (CSS section ownership), card-driven stage detection, lazy keep-alive
 * pane mounting, and the imperative stage-scroll api.
 */

import { beforeEach, afterEach, describe, expect, it, mock, type Mock } from 'bun:test'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { TourMobileRunwayProps } from './TourMobileRunway'
import type { TourStage } from './tourConstants'
import type { ScriptBlock } from '@/components/Editor/types'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import { TOUR_DEMO_SHARE } from './tourContextSize'

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
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => props.onChange?.(e.target.value)}
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

import { TourMobileRunway, type TourMobileRunwayApi } from './TourMobileRunway'

// jsdom lacks ResizeObserver; Headless UI's combobox machine touches it.
const globalWithResizeObserver = globalThis as unknown as { ResizeObserver?: unknown }
if (!globalWithResizeObserver.ResizeObserver) {
  globalWithResizeObserver.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// ── Controllable IntersectionObserver ────────────────────────────────────────

type TriggerEntry = { target: Element; isIntersecting: boolean; top?: number; height?: number }

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  observed: Element[] = []
  constructor(
    private readonly cb: (entries: unknown[], observer: unknown) => void,
    private readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this)
  }
  get rootMargin(): string {
    return this.options?.rootMargin ?? '0px 0px 0px 0px'
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  trigger(entries: TriggerEntry[]) {
    const mapped = entries.map((e) => {
      const top = e.top ?? 0
      const height = e.height ?? 100
      return {
        target: e.target,
        isIntersecting: e.isIntersecting,
        boundingClientRect: { top, height, bottom: top + height, left: 0, right: 320, width: 320, x: 0, y: top },
        intersectionRatio: e.isIntersecting ? 1 : 0,
        intersectionRect: {},
        rootBounds: null,
        time: 0,
      }
    })
    this.cb(mapped, this)
  }
}

const realIO = globalThis.IntersectionObserver
const installIO = () => {
  MockIntersectionObserver.instances = []
  // Swap in the controllable observer for the duration of a test.
  const ioHost = globalThis as unknown as { IntersectionObserver: unknown }
  ioHost.IntersectionObserver = MockIntersectionObserver
}
// Select the card driver by what it observes — no pinned rootMargin pixels
// (zone geometry belongs to the convention, not the test).
const cardEl = () => screen.getByTestId('tour-mobile-card-editor-blank')
const cardObserver = () =>
  MockIntersectionObserver.instances.find((o) => o.observed.includes(cardEl()))
// One arrival observer per chapter track — identified by its observed el.
const trackEl = (id: 'write' | 'run' | 'own' | 'explore') =>
  screen.getByTestId(`tour-mobile-runway-track-${id}`)
const trackObserver = (id: 'write' | 'run' | 'own' | 'explore') =>
  MockIntersectionObserver.instances.find((o) => o.observed.includes(trackEl(id)))

// ── Test data ───────────────────────────────────────────────────────────────

function makeProps(overrides: Partial<TourMobileRunwayProps> = {}): TourMobileRunwayProps {
  return {
    theme: 'light',
    quests: [] as Quest[],
    chapters: [] as Chapter[],
    questLabels: {},
    onHomeQuestClick: () => {},
    doc: 'AMRAP 10\n  10 Pull-ups\n',
    onDocChange: () => {},
    onBlocksChange: () => {},
    onRun: () => {},
    onChoice: () => {},
    onStageChange: () => {},
    timer: {
      sessionKey: 0,
      block: null,
      autoStart: false,
      onClose: () => {},
      onComplete: () => {},
      onRuntimeReady: () => {},
      onReset: () => {},
    },
    heroRef: { current: null },
    apiRef: { current: null },
    ...overrides,
  }
}

async function renderRunway(props: Partial<TourMobileRunwayProps> = {}) {
  const full = makeProps(props)
  const result = render(
    <MemoryRouter>
      <TourMobileRunway {...full} />
    </MemoryRouter>,
  )
  await act(async () => {
    await Promise.resolve()
  })
  return { result, props: full }
}

/** Latch a chapter track as reached (its window may mount its pane). */
async function reach(id: 'write' | 'run' | 'own' | 'explore') {
  await act(async () => {
    trackObserver(id)!.trigger([{ target: trackEl(id), isIntersecting: true }])
  })
}

/** Stub a card's viewport position (resolveVisibleStage reads live rects). */
function placeCard(stageId: string, top: number, height = 200) {
  const el = screen.getByTestId(`tour-mobile-card-${stageId}`)
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height, left: 0, right: 320, width: 320, x: 0, y: top }) as DOMRect
  return el
}

/** Center of the description zone — the 40% band under the stacked demo
    window, straight from the shared convention (portrait viewport below). */
const readingZoneCenter = () => {
  const top = Math.round(
    MOBILE_STICKY_TOP + (window.innerHeight - MOBILE_STICKY_TOP) * TOUR_DEMO_SHARE,
  )
  return top + (window.innerHeight - top) / 2
}

/** Drive the reading zone onto a stage's card (after its track is reached). */
async function arriveAt(stageId: string) {
  const zoneCenter = readingZoneCenter()
  const card = placeCard(stageId, zoneCenter - 100)
  await act(async () => {
    cardObserver()!.trigger([{ target: card, isIntersecting: true }])
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TourMobileRunway', () => {
  let scrollSpy: Mock<() => void>

  beforeEach(() => {
    installIO()
    // Portrait phone: pins the measured context to the stacked 60/40 shape —
    // these are behavioral tests; split orientation is viewport-shape, not
    // behavior, and the shared convention decides it from real dimensions.
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true, writable: true })
    scrollSpy = mock(() => {})
    // jsdom lacks scrollIntoView; the api under test only needs the call.
    const scrollTarget = Element.prototype as unknown as { scrollIntoView: unknown }
    scrollTarget.scrollIntoView = scrollSpy
  })

  afterEach(() => {
    cleanup()
    // Restore the real IntersectionObserver between tests.
    const ioHost = globalThis as unknown as { IntersectionObserver: unknown }
    ioHost.IntersectionObserver = realIO
  })

  it('gives the hero its own normal-flow view with the editor at first paint', async () => {
    await renderRunway()

    const hero = screen.getByTestId('tour-hero')
    // First paint: the hero hosts the shared document before any track ran.
    const heroEditor = hero.querySelector('[data-testid="mock-note-editor"]') as HTMLTextAreaElement
    expect(heroEditor).toBeTruthy()
    expect(heroEditor.value).toBe('AMRAP 10\n  10 Pull-ups\n')
    // The write window's pane is lazy — nothing pinned until its track runs.
    expect(
      screen.getByTestId('tour-mobile-runway-window-write').querySelector('[data-testid="mock-note-editor"]'),
    ).toBeNull()
  })

  it('reports no stage before any chapter track is reached', async () => {
    const stages: TourStage[] = []
    await renderRunway({ onStageChange: (s) => stages.push(s) })

    const el = placeCard('editor-blank', 500)
    await act(async () => {
      cardObserver()!.trigger([{ target: el, isIntersecting: true }])
    })

    expect(stages).toEqual([])
  })

  it('reports the stage whose card owns the reading zone once reached', async () => {
    const stages: TourStage[] = []
    await renderRunway({ onStageChange: (s) => stages.push(s) })

    await reach('write')
    await arriveAt('timer-wallclock')

    expect(stages.length).toBe(1)
    expect(stages[0].id).toBe('timer-wallclock')
    expect(stages[0].screen).toBe('timer')
  })

  it('mounts the clock only in the run window after its stage is visited', async () => {
    await renderRunway({
      timer: { ...makeProps().timer, block: { id: 'block-1', type: 'Timer' } as unknown as ScriptBlock },
    })

    await reach('write')
    await reach('run')
    // Reaching the track alone never creates a hidden runtime…
    expect(screen.queryByTestId('mock-timer-panel')).toBeNull()

    // …the clock stage must be actively visited.
    await arriveAt('timer-wallclock')
    const runWindow = screen.getByTestId('tour-mobile-runway-window-run')
    // Structure, not styling: the run chapter's section owns its window.
    expect(runWindow.closest('section')?.id).toBe('tour-section-run')
    expect(runWindow.querySelector('[data-testid="mock-timer-panel"]')).toBeTruthy()
  })

  it('keeps every editor display mounted across the chapter boundary so edits survive', async () => {
    const onDocChange = mock(() => {})
    await renderRunway({
      onDocChange,
      timer: { ...makeProps().timer, block: { id: 'block-1', type: 'Timer' } as unknown as ScriptBlock },
    })

    await reach('write')
    await arriveAt('timer-wallclock')

    // Hero display + write-window display + chapter-picker editor — the
    // scroll into the run chapter unmounted none of them.
    const hero = screen.getByTestId('tour-hero')
    expect(hero.querySelector('[data-testid="mock-note-editor"]')).toBeTruthy()
    const writeWindow = screen.getByTestId('tour-mobile-runway-window-write')
    const writeEditor = writeWindow.querySelector(
      '[data-testid="mock-note-editor"]',
    ) as HTMLTextAreaElement
    expect(writeEditor).toBeTruthy()
    expect(writeEditor.value).toBe('AMRAP 10\n  10 Pull-ups\n')
    expect(screen.getAllByTestId('mock-note-editor').length).toBe(3)

    // Same controlled document: an edit in the hero reaches the page state.
    fireEvent.change(hero.querySelector('[data-testid="mock-note-editor"]')!, {
      target: { value: 'AMRAP 12\n' },
    })
    expect(onDocChange).toHaveBeenCalledWith('AMRAP 12\n')
  })

  it('exposes scrollToStage which scrolls the stage card into view', async () => {
    const apiRef: { current: TourMobileRunwayApi | null } = { current: null }
    await renderRunway({ apiRef })

    expect(apiRef.current).toBeTruthy()
    apiRef.current!.scrollToStage('timer-cast')

    expect(scrollSpy).toHaveBeenCalled()
  })
})
