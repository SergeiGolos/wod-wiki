/**
 * Dynamic typeahead integration — ClausePopover × suggestion bindings (#831).
 *
 * Asserts:
 *   1. A slot popover lists suggestions loaded from its (async) binding.
 *   2. Empty sources render the binding's "nothing here yet" affordance.
 *   3. Discipline options display title-cased labels but emit the lowercase
 *      canonical value (prototype's capitalized-emission bug fixed).
 *   4. Open slots commit a user-typed value not in the list; closed slots
 *      (discipline) refuse it.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { WqlComposer } from './WqlComposer'
import { defaultClauses, type QueryClause } from './queryClauses'
import { invalidateSuggestions, setSuggestionBinding } from './suggestionSources'

afterEach(() => {
  cleanup()
  setSuggestionBinding('tag', undefined)
  invalidateSuggestions()
})

const composerWith = (clause: QueryClause, onClausesChange = mock((_c: QueryClause[]) => {})) => {
  const clauses = [...defaultClauses(), clause]
  render(<WqlComposer clauses={clauses} onClausesChange={onClausesChange} />)
  return onClausesChange
}

const openPopover = (type: string) => {
  fireEvent.click(screen.getByTestId(`token-slot-${type}`))
  return screen.getByTestId(`clause-popover-${type}`)
}

describe('ClausePopover dynamic suggestions', () => {
  it('lists suggestions loaded asynchronously from the slot binding', async () => {
    setSuggestionBinding('tag', {
      load: async () => [{ value: 'my-custom-tag' }, { value: 'pr', label: 'PR' }],
      cache: 'static',
      open: true,
      emptyText: 'No tags yet',
    })
    composerWith({ id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: '' })
    openPopover('tag')

    expect(await screen.findByText('my-custom-tag')).toBeTruthy()
    expect(screen.getByText('PR')).toBeTruthy()
  })

  it('renders the binding empty-state copy when the source has no rows', async () => {
    setSuggestionBinding('tag', {
      load: async () => [],
      cache: 'static',
      open: true,
      emptyText: 'No tags yet — type one to filter by it',
    })
    composerWith({ id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: '' })
    openPopover('tag')

    const empty = await screen.findByTestId('clause-empty-tag')
    expect(empty.textContent).toContain('No tags yet — type one to filter by it')
  })

  it('shows title-cased discipline labels but emits the lowercase canonical value', async () => {
    const onClausesChange = composerWith(
      { id: 'c-disc', type: 'discipline', label: 'Discipline', value: '', inputType: 'select', placeholder: '' },
    )
    openPopover('discipline')

    const option = await screen.findByText('Strength')
    fireEvent.click(option)

    expect(onClausesChange).toHaveBeenCalledTimes(1)
    const next = onClausesChange.mock.calls[0][0] as QueryClause[]
    expect(next.find(c => c.type === 'discipline')?.value).toBe('strength')
  })

  it('commits a typed value not in the list for open slots (tag)', async () => {
    setSuggestionBinding('tag', {
      load: async () => [{ value: 'pr' }],
      cache: 'static',
      open: true,
      emptyText: 'No tags yet',
    })
    const onClausesChange = composerWith(
      { id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: '' },
    )
    const popover = openPopover('tag')

    const input = popover.querySelector('input')!
    await screen.findByText('pr') // wait for the async load first
    fireEvent.change(input, { target: { value: 'brand-new' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onClausesChange).toHaveBeenCalledTimes(1)
    const next = onClausesChange.mock.calls[0][0] as QueryClause[]
    expect(next.find(c => c.type === 'tag')?.value).toBe('brand-new')
  })

  it('refuses a typed value not in the list for closed slots (discipline)', async () => {
    const onClausesChange = composerWith(
      { id: 'c-disc', type: 'discipline', label: 'Discipline', value: '', inputType: 'select', placeholder: '' },
    )
    const popover = openPopover('discipline')

    const input = popover.querySelector('input')!
    await screen.findByText('Strength') // wait for the async load first
    fireEvent.change(input, { target: { value: 'not-a-discipline' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onClausesChange).not.toHaveBeenCalled()
  })
})
