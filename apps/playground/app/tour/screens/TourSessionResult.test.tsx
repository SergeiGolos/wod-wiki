import { describe, expect, it, mock } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourSessionResult } from './TourSessionResult'
import type { Sessions, StoredOutputStatement } from '@/components/Editor/types'

const sampleSession: Sessions = {
  startTime: 1000,
  endTime: 61000,
  duration: 60000,
  completed: true,
  roundsCompleted: 3,
  totalRounds: 3,
  repsCompleted: 45,
  logs: [
    {
      id: 1,
      outputType: 'segment' as const,
      timeSpan: { started: 1000, ended: 21000 },
      metrics: [
        { type: 'effort', value: 'Pullups' },
        { type: 'rep', value: 15 },
      ],
      sourceBlockKey: 'b1',
      stackLevel: 0,
    } as StoredOutputStatement,
    {
      id: 2,
      outputType: 'event' as const,
      timeSpan: { started: 21000, ended: 23000 },
      metrics: [{ type: 'sound', value: 'beep' }],
      sourceBlockKey: 'b1',
      stackLevel: 0,
    } as StoredOutputStatement,
  ],
}

describe('TourSessionResult', () => {
  it('renders the session results table with filter pills', () => {
    render(<TourSessionResult result={sampleSession} />)
    expect(screen.getByTestId('tour-session-result')).toBeDefined()
    expect(screen.getByTestId('output-statements-table')).toBeDefined()
    expect(screen.getByTestId('output-filter-preset-all')).toBeDefined()
    expect(screen.getByTestId('output-filter-preset-segments')).toBeDefined()
    expect(screen.getByTestId('output-filter-preset-events')).toBeDefined()

    // Default filter is type:segment, so only the segment row shows initially in tbody
    const table = screen.getByTestId('output-statements-table')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1)

    // Switch to All to show both segment and event
    fireEvent.click(screen.getByTestId('output-filter-preset-all'))
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2)
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = mock(() => {})
    render(<TourSessionResult result={sampleSession} onDismiss={onDismiss} dismissLabel="Done" />)
    fireEvent.click(screen.getByTestId('tour-session-result-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
