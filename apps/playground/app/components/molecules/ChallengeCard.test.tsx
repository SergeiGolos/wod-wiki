import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

import { ChallengeCard } from './ChallengeCard'
import type { Quest } from '../../canvas/parseCanvasMarkdown'

afterEach(() => {
  cleanup()
})

const quest: Quest & { isCompleted: boolean } = {
  id: 'qs-edit',
  label: 'Change the workout',
  isCompleted: false,
}

describe('ChallengeCard', () => {
  it('renders a button with a jump hint when onClick is provided', () => {
    const onClick = mock(() => {})
    render(<ChallengeCard quest={quest} onClick={onClick} />)

    const card = screen.getByTestId('challenge-row-qs-edit')
    expect(card.tagName).toBe('BUTTON')
    expect(screen.getByText('Select to jump to its section.')).toBeTruthy()

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a non-interactive div — not a dead button — when onClick is absent', () => {
    render(<ChallengeCard quest={quest} />)

    const card = screen.getByTestId('challenge-row-qs-edit')
    expect(card.tagName).toBe('DIV')
    expect(screen.queryByRole('button')).toBeNull()
    // The hint must not promise an editor the card cannot open.
    expect(screen.getByText('Open the editor to begin.')).toBeTruthy()
  })

  it('keeps a disabled button (not a div) when onClick exists but is disabled', () => {
    render(<ChallengeCard quest={quest} onClick={() => {}} disabled />)

    const card = screen.getByTestId('challenge-row-qs-edit')
    expect(card.tagName).toBe('BUTTON')
    expect((card as HTMLButtonElement).disabled).toBe(true)
  })
})
