/**
 * FirstNoteWizard — close-contract tests.
 *
 * ADR-0010 (Decision 2, Dismissal semantics) locks the contract: `onClose`
 * fires with `completed: true` only from the final-step Done button; all
 * other close paths (Skip / Esc / backdrop) fire with `completed: false`.
 * The consumer uses the boolean to decide whether to flip the one-shot gate.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { FirstNoteWizard } from './FirstNoteWizard'

afterEach(() => {
  cleanup()
})

describe('FirstNoteWizard close contract', () => {
  it('Skip button invokes onClose with completed=false', () => {
    const onClose = mock<(completed: boolean) => void>(() => {})

    render(<FirstNoteWizard open={true} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /skip/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose.mock.calls[0]?.[0]).toBe(false)
  })

  it('clicking through all three steps and pressing Done invokes onClose with completed=true', () => {
    const onClose = mock<(completed: boolean) => void>(() => {})

    render(<FirstNoteWizard open={true} onClose={onClose} />)

    // Step 1: pick a goal so we can advance.
    fireEvent.click(screen.getByRole('button', { name: /general fitness/i }))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 2: pick units.
    fireEvent.click(screen.getByRole('button', { name: /pounds/i }))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 3: pick a suggested effort.
    fireEvent.click(screen.getByRole('button', { name: /^pullups$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose.mock.calls[0]?.[0]).toBe(true)
  })

  it('renders nothing when open=false (consumer controls visibility)', () => {
    render(<FirstNoteWizard open={false} onClose={() => {}} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // Note on consumer-side wiring: rendering the full PlaygroundNotePage
  // pulls in EditorView, IndexedDB, theme provider, command palette, etc.,
  // so this file tests the wizard in isolation. The consumer wiring
  // (`open={isFirstNote && !isInitialized && !dismissed}` + the dismissed
  // `setDismissed(true)` branch in handleClose) is exercised by
  // useFirstNoteWizardState.test.ts via renderHook, which is the real
  // regression guard for the #662-revision trap (a literal `return`
  // inside the !completed branch left the dialog non-dismissible).
  // Standard Headless UI controlled-Dialog pattern; jsdom doesn't fire
  // leave transitions, so testing the unmount via fireEvent+assertion
  // here times out — the renderHook tests are the right surface.
})