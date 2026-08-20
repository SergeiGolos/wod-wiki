/**
 * HomeTour.share.test.tsx — isolated share-feedback tests for the home tour hero.
 *
 * Kept separate from HomeTour.test.tsx so the heavy mocks required by the
 * scroll/runway tests do not interfere with the clipboard/toast assertions.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'

const toastMock = mock(() => {})

mock.module('@/hooks/use-toast', () => ({
  toast: toastMock,
}))

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

mock.module('../canvas/useScrollRunway', () => {
  return {
    useScrollRunway: () => ({
      slice: {
        index: 0,
        stage: {
          id: 'timer',
          screen: 'timer',
          accent: 'hsl(var(--metric-effort))',
          label: 'What Happens When It Runs',
        },
        t: 0.1,
        ring: { key: 'timer.floor', tag: 'WallClock' },
      },
      progress: 0,
      subscribe: () => () => {},
      resync: () => {},
    }),
    scrollRunwayTo: () => {},
  }
})

import { HomeTour } from './HomeTour'

const wodFiles: Record<string, string> = {
  'wods/examples/home/welcome-1.md': 'AMRAP 10\n  10 Pull-ups\n  15 Push-ups\n  20 Air Squats\n',
}

const homeQuests: Quest[] = []
const chapters: Chapter[] = []
const questLabels: Record<string, string> = {}

describe('HomeTour share feedback', () => {
  let recorded: Array<{ name: string; payload?: Record<string, unknown> }> = []
  let unsubscribe: () => void = () => {}

  beforeEach(() => {
    recorded = []
    unsubscribe = telemetry.events.subscribe((event) => recorded.push(event))
    toastMock.mockClear?.()

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

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mock(() => Promise.resolve()) },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    unsubscribe()
    cleanup()
    window.localStorage.clear()
  })

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

  it('shows a confirmation toast and records the event when share succeeds', async () => {
    await renderHomeTour()

    const shareButton = await screen.findByRole('button', { name: /Copy share link/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled()
    })

    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.demoShared)
    expect((toastMock.mock.calls[0] as unknown as [{ title: string }])[0]).toMatchObject({
      title: 'Link copied',
      description: 'Share link copied to clipboard.',
    })
  })

  it('shows an error toast and does not record the event when share fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mock(() => Promise.reject(new Error('Clipboard denied'))) },
      configurable: true,
      writable: true,
    })

    await renderHomeTour()

    const shareButton = await screen.findByRole('button', { name: /Copy share link/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled()
    })

    expect(recorded.map((e) => e.name)).not.toContain(HOME_EVENTS.demoShared)
    expect((toastMock.mock.calls[0] as unknown as [{ title: string }])[0]).toMatchObject({
      title: 'Could not copy',
      variant: 'destructive',
    })
  })
})
