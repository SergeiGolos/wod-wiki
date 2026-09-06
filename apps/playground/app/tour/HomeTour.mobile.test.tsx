/**
 * HomeTour.mobile.test.tsx — form-factor branch contract (wayfinder map #911):
 * mobile renders the sticky-editor runway, prefers-reduced-motion keeps the
 * flat card stack on every form factor, desktop renders neither.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'

// ── Form-factor flags the dynamic mocks read at render time ─────────────────

const flags = globalThis as unknown as { __isMobile?: boolean; __reducedMotion?: boolean }

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
    getFactsByMetric: mock(async () => []),
  },
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

mock.module('../services/createPlaygroundPage', () => ({
  ensurePlaygroundEntry: mock(async () => ({ noteId: 'playground-note-test', routeId: 'playground/test' })),
  createPlaygroundPage: mock(async () => 'test-page'),
  movePlaygroundToJournal: mock(async (noteId: string) => ({ id: noteId })),
}))

mock.module('../services/journalWorkout', () => ({
  createJournalNoteFromWorkout: async () => ({ id: 'note-clone' }),
}))

mock.module('../services/journalNotes', () => ({
  journalNotes: { create: async () => ({ id: 'note-new' }) },
}))

mock.module('../hooks/useIsMobile', () => ({
  useIsMobile: () => flags.__isMobile === true,
}))

// Desktop scroll driver held inert — the branch contract doesn't scroll.
mock.module('../canvas/useScrollRunway', () => ({
  useScrollRunway: () => ({
    slice: {
      index: 0,
      stage: {
        id: 'editor-blank',
        screen: 'editor',
        accent: 'hsl(var(--metric-resistance))',
        label: 'Blank Page & Typeahead',
      },
      t: 0,
      ring: { key: 'editor.window', tag: 'Live Editor' },
    },
    progress: 0,
    runwayReached: false,
    subscribe: () => () => {},
    resync: () => {},
  }),
  scrollRunwayTo: () => {},
}))

import { HomeTour } from './HomeTour'

// ── matchMedia: only prefers-reduced-motion is flag-driven ──────────────────

const realMatchMedia = window.matchMedia
const installMatchMedia = () => {
  ;(window as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? flags.__reducedMotion === true : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

// ── Test data ───────────────────────────────────────────────────────────────

const wodFiles: Record<string, string> = {
  '../../markdown/canvas/wods/examples/home/welcome-1.md': 'AMRAP 10\n  10 Pull-ups\n',
}

async function renderHomeTour() {
  const result = render(
    <MemoryRouter>
      <HomeTour
        wodFiles={wodFiles}
        theme="light"
        quests={[] as Quest[]}
        chapters={[] as Chapter[]}
      />
    </MemoryRouter>,
  )
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

const hasRunway = () => screen.queryByTestId('tour-mobile-runway') !== null
const hasFlatStack = () => screen.queryByTestId('tour-mobile-stack') !== null

// ── Tests ───────────────────────────────────────────────────────────────────

describe('HomeTour form-factor branches', () => {
  beforeEach(() => {
    flags.__isMobile = false
    flags.__reducedMotion = false
    installMatchMedia()
  })

  afterEach(() => {
    cleanup()
    window.matchMedia = realMatchMedia
  })

  it('renders the sticky runway on mobile', async () => {
    flags.__isMobile = true
    await renderHomeTour()

    expect(hasRunway()).toBe(true)
    expect(hasFlatStack()).toBe(false)
  })

  it('keeps the flat stack under prefers-reduced-motion on mobile', async () => {
    flags.__isMobile = true
    flags.__reducedMotion = true
    await renderHomeTour()

    expect(hasFlatStack()).toBe(true)
    expect(hasRunway()).toBe(false)
  })

  it('keeps the flat stack under prefers-reduced-motion on desktop too', async () => {
    flags.__reducedMotion = true
    await renderHomeTour()

    expect(hasFlatStack()).toBe(true)
    expect(hasRunway()).toBe(false)
  })

  it('renders neither mobile layout on desktop', async () => {
    await renderHomeTour()

    expect(hasRunway()).toBe(false)
    expect(hasFlatStack()).toBe(false)
  })
})
