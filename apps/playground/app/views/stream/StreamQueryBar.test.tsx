/**
 * StreamQueryBar — the header query bar's observable contract.
 *
 * 1. The bar hosts the shared compact WqlComposer: no header-local draft
 *    parser, no separate scope dropdown — scope favorites flow into the
 *    composer as preferredChoices and kind/target/scope editing happens in
 *    the composer's one searchable picker.
 * 2. Typing resolves synchronously through onQueryChange: valid filter
 *    fragments emit the resolved query, invalid text emits its exact draft.
 * 3. ⌘K (and the compact mobile row) open the command palette in WQL mode
 *    seeded with the current query; Apply writes the composed WQL back
 *    through onQueryChange.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StreamQueryBar } from './StreamQueryBar'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'

let lastQuery = ''

const noopExecute = (() => Promise.resolve({})) as never

function Bar(props: Partial<Parameters<typeof StreamQueryBar>[0]> = {}) {
  return (
    <MemoryRouter>
      <StreamQueryBar
        query='find:note{source:journal,text:"deadlift"} last 2w'
        onQueryChange={(w) => {
          lastQuery = w
        }}
        scopeOptions={['journal', 'collections', 'feeds']}
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
  it('hosts the shared composer — no separate scope dropdown or draft input', () => {
    render(<Bar />)
    expect(screen.getByTestId('stream-query-bar')).toBeDefined()
    expect(screen.getByPlaceholderText('Filter or search…')).toBeDefined()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByTestId('stream-query-type')).toBeNull()
  })

  it('emits the resolved query synchronously when a filter fragment is typed', () => {
    render(<Bar />)
    const input = screen.getByPlaceholderText('Filter or search…')
    fireEvent.change(input, { target: { value: 'tags:strength' } })
    // Same parsing as the dialog: the fragment becomes a real clause while
    // the scope filter and window survive untouched.
    expect(lastQuery).toContain('tags:strength')
    expect(lastQuery).toContain('source:journal')
    expect(lastQuery).toContain('last 2w')
  })

  it('emits invalid text unchanged — no parse attempt, no default pills', () => {
    render(<Bar />)
    const input = screen.getByPlaceholderText('Filter or search…')
    fireEvent.change(input, { target: { value: 'find:note{oops' } })
    expect(lastQuery).toBe('find:note{oops')
  })

  it('opens the command palette WQL mode with the current query via ⌘K', () => {
    render(<Bar />)
    fireEvent.click(screen.getByTitle('Edit query (⌘K)'))
    const state = usePaletteStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.request?.wql?.initialQuery).toBe('find:note{source:journal,text:"deadlift"} last 2w')
    expect(state.request?.wql?.onApply).toBeDefined()
  })

  it('does not open the command palette on a plain bar click', () => {
    render(<Bar />)
    fireEvent.click(screen.getByTestId('stream-query-bar'))
    expect(usePaletteStore.getState().isOpen).toBe(false)
  })

  it('compact variant summarizes the query and opens the palette on tap', () => {
    render(<Bar compact />)
    expect(screen.getByTestId('stream-query-summary').textContent).toBe(
      'find:note{source:journal,text:"deadlift"} last 2w',
    )
    fireEvent.click(screen.getByTestId('stream-query-bar'))
    expect(usePaletteStore.getState().isOpen).toBe(true)
  })
})
