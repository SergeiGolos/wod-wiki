import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

import { ChallengeHeaderBadge } from './ChallengeHeaderBadge'
import type { Quest } from '../../canvas/parseCanvasMarkdown'

mock.module('../../hooks/usePageQuests', () => ({
  usePageQuests: (_pageRoute: string, quests: Quest[]) => ({
    quests: quests.map((q) => ({ ...q, isCompleted: q.id === 'done-quest' })),
    stepsComplete: quests.filter((q) => q.id === 'done-quest').length,
    totalSteps: quests.length,
    isComplete: quests.every((q) => q.id === 'done-quest'),
    markComplete: () => {},
    toggleQuest: () => {},
  }),
}))

afterEach(() => {
  cleanup()
})

describe('ChallengeHeaderBadge', () => {
  it('renders a badge with completed / total', () => {
    const quests: Quest[] = [
      { id: 'done-quest', label: 'Done quest' },
      { id: 'pending-quest', label: 'Pending quest' },
    ]

    render(
      <ChallengeHeaderBadge
        pageRoute="/guide/demo"
        quests={quests}
        challengeSectionMap={new Map([['done-quest', 'sec-1']])}
      />,
    )

    expect(screen.getAllByText('1/2').length).toBeGreaterThanOrEqual(1)
  })

  it('opens the dropdown on click and calls onScrollToSection when a challenge is clicked', () => {
    const quests: Quest[] = [{ id: 'done-quest', label: 'Done quest' }]
    const onScrollToSection = mock(() => {})

    render(
      <ChallengeHeaderBadge
        pageRoute="/guide/demo"
        quests={quests}
        challengeSectionMap={new Map([['done-quest', 'sec-1']])}
        onScrollToSection={onScrollToSection}
      />,
    )

    const badge = screen.getByRole('button', { expanded: false })
    fireEvent.click(badge)

    const item = screen.getByText('Done quest')
    fireEvent.click(item)
    expect(onScrollToSection).toHaveBeenCalledWith('sec-1')
  })

  it('returns null when there are no quests', () => {
    const { container } = render(
      <ChallengeHeaderBadge
        pageRoute="/guide/demo"
        quests={[]}
        challengeSectionMap={new Map()}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
