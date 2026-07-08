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

  // Note on consumer-side wiring (covered by PlaygroundNotePage's manual
  // verification, not unit-tested here because rendering the full page
  // pulls in EditorView, IndexedDB, theme provider, command palette, etc.):
  // the consumer must flip `open` to false on `onClose(false)` for the
  // controlled Dialog to close. The fix for the #662-revision trap
  // (PlaygroundNotePage.tsx: now binds `open={isFirstNote && !isInitialized
  // && !dismissed}` and calls `setDismissed(true)` in handleWizardClose's
  // !completed branch) is the canonical pattern. A future refactor that
  // extracts this into a `useFirstNoteWizardState()` hook would let this
  // test move to a renderHook-based assertion — that's the layer-shape
  // work the wayfinder map parked as a fog item.
})