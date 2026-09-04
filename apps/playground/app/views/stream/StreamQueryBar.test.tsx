/**
 * StreamQueryBar — the header query bar's observable contract.
 *
 * 1. The type selector states the current plane (via sourceOfQuery) and
 *    pivots the query through onQueryChange when another type is picked.
 * 2. Chips mirror parsed.filters (minus the source-carrier) + the window;
 *    ✕ removes exactly that clause.
 * 3. Tapping the bar (or the compact variant) opens the command palette in
 *    WQL mode seeded with the current query — crafting happens there, and
 *    Apply writes the composed WQL back through onQueryChange.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StreamQueryBar } from './StreamQueryBar'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { sourceOfQuery } from '../../lib/wqlEdits'

let lastQuery = ''

const noopExecute = (() => Promise.resolve({})) as never

function Bar(props: Partial<Parameters<typeof StreamQueryBar>[0]> = {}) {
  return (
    <MemoryRouter>
      <StreamQueryBar
        query='find:note{text:"deadlift",tags:strength} last 2w'
        onQueryChange={(w) => {
          lastQuery = w
        }}
        options={['notes', 'journal', 'collections', 'feeds', 'blocks']}
        execute={noopExecute}
        {...props}
      />
    </MemoryRouter>
  )
}

beforeEach(() => {
  lastQuery = ''
  usePaletteStore.setState({ isOpen: false, request: null, _resolve: null })
})

afterEach(cleanup)

describe('StreamQueryBar', () => {
  it('labels the current data type and renders chips for filters + window', () => {
    render(<Bar />)
    expect(screen.getByTestId('stream-query-type').textContent).toContain('All Notes')
    const chips = screen.getAllByTestId('stream-query-chip').map((c) => c.textContent)
    expect(chips.some((c) => c?.includes('text:deadlift'))).toBe(true)
    expect(chips.some((c) => c?.includes('tags:strength'))).toBe(true)
    expect(chips.some((c) => c?.includes('last 2w'))).toBe(true)
  })

  it('labels a locked route by its single data type', () => {
    render(<Bar query='find:effort' options={['efforts']} />)
    expect(screen.getByTestId('stream-query-type').textContent).toContain('Efforts')
  })

  it('pivots the query head when another data type is selected', () => {
    render(<Bar />)
    fireEvent.click(screen.getByTestId('stream-query-type'))
    fireEvent.click(screen.getByTestId('stream-query-type-journal'))
    expect(lastQuery).not.toBe('')
    expect(sourceOfQuery(lastQuery)).toBe('journal')
    // Shared filters and window survive the pivot.
    expect(lastQuery).toContain('deadlift')
    expect(lastQuery).toContain('last 2w')
  })

  it('removes a filter chip without touching the rest', () => {
    render(<Bar />)
    const chip = screen
      .getAllByTestId('stream-query-chip')
      .find((c) => c?.textContent?.includes('text:deadlift'))
    fireEvent.click(chip!.querySelector('button')!)
    expect(lastQuery).toBe('find:note{tags:strength} last 2w')
  })

  it('removes the time window chip', () => {
    render(<Bar />)
    const chip = screen
      .getAllByTestId('stream-query-chip')
      .find((c) => c?.textContent?.includes('last 2w'))
    fireEvent.click(chip!.querySelector('button')!)
    // Serializer emits the canonical (unquoted) value token.
    expect(lastQuery).toBe('find:note{text:deadlift,tags:strength}')
  })

  it('shows the raw query when it does not parse (escape hatch, nothing removable)', () => {
    render(<Bar query='find:note{oops' />)
    expect(screen.getByTestId('stream-query-raw').textContent).toBe('find:note{oops')
    expect(screen.queryAllByTestId('stream-query-chip')).toHaveLength(0)
  })

  it('opens the command palette WQL mode seeded with the current query', () => {
    render(<Bar />)
    fireEvent.click(screen.getByTestId('stream-query-bar'))
    const state = usePaletteStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.request?.wql?.initialQuery).toBe('find:note{text:"deadlift",tags:strength} last 2w')
    expect(state.request?.wql?.onApply).toBeDefined()
  })

  it('compact variant summarizes the query and opens the palette on tap', () => {
    render(<Bar compact />)
    expect(screen.getByTestId('stream-query-summary').textContent).toBe(
      'find:note{text:"deadlift",tags:strength} last 2w',
    )
    fireEvent.click(screen.getByTestId('stream-query-bar'))
    expect(usePaletteStore.getState().isOpen).toBe(true)
  })

  it('compact variant wires the view-settings affordance', () => {
    let opened = false
    render(<Bar compact onViewSettings={() => (opened = true)} />)
    fireEvent.click(screen.getByTestId('stream-query-view-settings'))
    expect(opened).toBe(true)
  })
})
