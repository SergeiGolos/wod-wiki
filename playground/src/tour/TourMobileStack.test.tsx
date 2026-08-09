/**
 * TourMobileStack.test.tsx — mobile static-card layout assertions.
 */

import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import type { Quest, Chapter } from '../canvas/parseCanvasMarkdown'
import type { TourMobileStackProps } from './TourMobileStack'
import type { ScriptBlock } from '@/components/Editor/types'

// ── Heavy dependencies ───────────────────────────────────────────────────────

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

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getFactsByTimeRange: mock(async () => []),
  },
}))

import { TourMobileStack } from './TourMobileStack'

// ── Test data ────────────────────────────────────────────────────────────────

const baseProps = {
  theme: 'light',
  quests: [] as Quest[],
  chapters: [] as Chapter[],
  questLabels: {},
  doc: 'AMRAP 10\n  10 Pull-ups\n',
  onDocChange: () => {},
  onBlocksChange: () => {},
  onRun: () => {},
  onShare: () => {},
  onOpenInEditor: () => {},
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TourMobileStack', () => {
  let recorded: Array<{ name: string; payload?: Record<string, unknown> }> = []
  let unsubscribe: () => void = () => {}

  beforeEach(() => {
    recorded = []
    unsubscribe = telemetry.events.subscribe((event) => recorded.push(event))
  })

  afterEach(() => {
    unsubscribe()
    cleanup()
  })

  async function renderStack(props: Partial<TourMobileStackProps> = {}) {
    const result = render(
      <MemoryRouter>
        <TourMobileStack {...baseProps} {...props} />
      </MemoryRouter>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    return result
  }

  it('renders exactly one behaviors link in the timer card', async () => {
    await renderStack()

    const card = screen.getByTestId('tour-timer-card')
    expect(card).toBeTruthy()

    const links = screen.getAllByRole('link', { name: /Read the behaviors explainer/i })
    expect(links.length).toBe(1)
    expect(links[0].getAttribute('href')).toBe('/guide/behaviors')
  })

  it('records the correct telemetry event from the timer card drop-off', async () => {
    await renderStack()

    const link = screen.getByRole('link', { name: /Read the behaviors explainer/i })
    link.click()
    expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.behaviorsOpened)
  })
})
