/**
 * TourMobileRunway.test.tsx — mobile sticky-editor scroll runway contracts
 * (wayfinder map #911): pinned window parity with the syntax guides, card-
 * driven stage detection, and the imperative stage-scroll api.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { TourMobileRunwayProps } from './TourMobileRunway'
import type { TourStage } from './tourStages'
import type { ScriptBlock } from '@/components/Editor/types'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'

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

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getFactsByTimeRange: mock(async () => []),
  },
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
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver
}
const cardObserver = () =>
  MockIntersectionObserver.instances.find((o) => o.rootMargin.endsWith('-30% 0px'))
const reachedObserver = () =>
  MockIntersectionObserver.instances.find((o) => o.rootMargin.startsWith(`-${MOBILE_STICKY_TOP + 1}px`))

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
    onShare: () => {},
    onOpenInEditor: () => {},
    onChoice: () => {},
    entered: { editor: true, timer: false, analytics: false },
    onStageChange: () => {},
    timer: {
      sessionKey: 0,
      block: null,
      autoStart: false,
      externalPause: false,
      onClose: () => {},
      onComplete: () => {},
      onRuntimeReady: () => {},
      onReset: () => {},
    },
    analyticsSegments: [],
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

/** Stub a card's viewport position (resolveVisibleStage reads live rects). */
function placeCard(stageId: string, top: number, height = 200) {
  const el = screen.getByTestId(`tour-mobile-card-${stageId}`)
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height, left: 0, right: 320, width: 320, x: 0, y: top }) as DOMRect
  return el
}

/** Center of the reading zone below the pinned window (component's math). */
const readingZoneCenter = () => {
  const top = Math.round(window.innerHeight / 2 + MOBILE_STICKY_TOP / 2)
  return top + (window.innerHeight - top) / 2
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TourMobileRunway', () => {
  let scrollSpy: ReturnType<typeof mock>

  beforeEach(() => {
    installIO()
    scrollSpy = mock(() => {})
    ;(Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollSpy
  })

  afterEach(() => {
    cleanup()
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = realIO
  })

  it('renders the pinned editor window and all seven caption cards', async () => {
    await renderRunway()

    // The pinned window holds the live hero editor.
    const window_ = screen.getByTestId('tour-mobile-runway-window')
    expect(window_.textContent).toContain('WOD Editor & Autocomplete')
    expect(screen.getByTestId('mock-note-editor')).toBeTruthy()

    for (const stageId of [
      'editor-blank',
      'editor-metrics',
      'editor-run',
      'timer-wallclock',
      'timer-next',
      'analytics-scorecard',
      'analytics-grid',
    ]) {
      expect(screen.getByTestId(`tour-mobile-card-${stageId}`)).toBeTruthy()
    }
  })

  it('pins the window with the syntax-guides mobile geometry', async () => {
    await renderRunway()

    const window_ = screen.getByTestId('tour-mobile-runway-window')
    expect(window_.className).toContain('sticky')
    expect(window_.style.top).toBe(`${MOBILE_STICKY_TOP}px`)
    expect(window_.style.height).toBe(`calc(50vh - ${MOBILE_STICKY_TOP / 2}px)`)
  })

  it('reports no stage before the runway is reached', async () => {
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

    const zoneCenter = readingZoneCenter()
    await act(async () => {
      reachedObserver()!.trigger([
        { target: screen.getByTestId('tour-mobile-runway-track'), isIntersecting: true },
      ])
    })

    const timerCard = placeCard('timer-wallclock', zoneCenter - 100)
    await act(async () => {
      cardObserver()!.trigger([{ target: timerCard, isIntersecting: true }])
    })

    expect(stages.length).toBe(1)
    expect(stages[0].id).toBe('timer-wallclock')
    expect(stages[0].screen).toBe('timer')
  })

  it('swaps the pinned window to the timer screen on the timer stage', async () => {
    await renderRunway({
      entered: { editor: true, timer: true, analytics: false },
      timer: { ...makeProps().timer, block: { id: 'block-1', type: 'Timer' } as unknown as ScriptBlock },
    })

    const zoneCenter = readingZoneCenter()

    await act(async () => {
      reachedObserver()!.trigger([
        { target: screen.getByTestId('tour-mobile-runway-track'), isIntersecting: true },
      ])
      const timerCard = placeCard('timer-wallclock', zoneCenter - 100)
      cardObserver()!.trigger([{ target: timerCard, isIntersecting: true }])
    })

    expect(screen.getByTestId('mock-timer-panel')).toBeTruthy()
    expect(screen.getByTestId('tour-mobile-runway-window').textContent).toContain('WallClock')
  })

  it('keeps the editor mounted across stage swaps so edits survive', async () => {
    await renderRunway({
      entered: { editor: true, timer: true, analytics: false },
      timer: { ...makeProps().timer, block: { id: 'block-1', type: 'Timer' } as unknown as ScriptBlock },
    })

    const zoneCenter = readingZoneCenter()

    await act(async () => {
      reachedObserver()!.trigger([
        { target: screen.getByTestId('tour-mobile-runway-track'), isIntersecting: true },
      ])
      const timerCard = placeCard('timer-wallclock', zoneCenter - 100)
      cardObserver()!.trigger([{ target: timerCard, isIntersecting: true }])
    })

    // The editor stays in the DOM (cross-faded out, not unmounted).
    expect(screen.getByTestId('mock-note-editor')).toBeTruthy()
  })

  it('exposes scrollToStage which scrolls the stage card into view', async () => {
    const apiRef: { current: TourMobileRunwayApi | null } = { current: null }
    await renderRunway({ apiRef })

    expect(apiRef.current).toBeTruthy()
    apiRef.current!.scrollToStage('analytics-scorecard')

    expect(scrollSpy).toHaveBeenCalled()
  })

  it('shows the single week-facts stat on the analytics card (spec §2)', async () => {
    const { indexedDBService } = await import('@/services/db/IndexedDBService')
    ;(indexedDBService.getFactsByTimeRange as ReturnType<typeof mock>).mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({ id: i })),
    )

    await renderRunway()

    const card = screen.getByTestId('tour-mobile-card-analytics-scorecard')
    expect(card.textContent).toContain('12')
    expect(card.textContent).toContain('facts logged in the last 7 days')
  })
})
