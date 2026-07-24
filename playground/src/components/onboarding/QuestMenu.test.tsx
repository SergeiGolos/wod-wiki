import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

import { QuestMenu } from './QuestMenu'
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

mock.module('../../hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => ({
    progress: {
      visitedLanding: true,
      editedNote: false,
      ranWorkout: false,
      loggedEffort: false,
      openedReview: false,
    },
    stepsComplete: 1,
    totalSteps: 5,
    isComplete: false,
    mark: () => {},
  }),
}))

mock.module('../../hooks/useChapterProgress', () => ({
  useChapterProgress: (chapters: Array<{ id: string; title: string; badge: string; questIds: string[] }>) => ({
    chapters: chapters.map((chapter) => ({
      chapter,
      completedCount: chapter.id === 'done-chapter' ? chapter.questIds.length : 0,
      totalCount: chapter.questIds.length,
      isComplete: chapter.id === 'done-chapter',
    })),
  }),
}))

mock.module('../../services/playgroundProfile', () => ({
  getProfile: () => ({ completionCelebrated: true }),
  updateProfile: () => {},
}))

// Proto flag off — ChallengeCard imports it for the hint-ladder prototype.
mock.module('../../proto/ProtoVariantSwitch', () => ({
  useProtoVariant: () => ({ proto: false, variant: 'today', cycle: () => {} }),
  PROTO_VARIANTS: ['today', 'synthesis'],
}))

afterEach(() => {
  cleanup()
})

const DEMO_CHAPTERS = [
  { id: 'done-chapter', title: 'Basics', badge: 'trophy', questIds: ['q1'], sectionIds: [] },
  { id: 'open-chapter', title: 'Protocols', badge: 'timer', questIds: ['q2', 'q3'], sectionIds: [] },
]

describe('QuestMenu', () => {
  it('renders a combined summary across roadmap steps and page quests', () => {
    const quests: Quest[] = [
      { id: 'done-quest', label: 'Done quest' },
      { id: 'pending-quest', label: 'Pending quest' },
    ]

    render(
      <QuestMenu
        pageRoute="/"
        quests={quests}
        includeRoadmap
        challengeSectionMap={new Map()}
      />,
    )

    // roadmap 1/5 + quests 1/2 → 2/7 in a single trigger
    expect(screen.getByTestId('quest-menu-summary').textContent).toBe('2/7')
  })

  it('renders quests-only summary when the roadmap is not included', () => {
    const quests: Quest[] = [
      { id: 'done-quest', label: 'Done quest' },
      { id: 'pending-quest', label: 'Pending quest' },
    ]

    render(
      <QuestMenu
        pageRoute="/guide/demo"
        quests={quests}
        challengeSectionMap={new Map()}
      />,
    )

    expect(screen.getByTestId('quest-menu-summary').textContent).toBe('1/2')
  })

  it('opens one dropdown with roadmap, challenges, and chapters sections', () => {
    const quests: Quest[] = [{ id: 'done-quest', label: 'Done quest' }]
    const onScrollToSection = mock(() => {})

    render(
      <QuestMenu
        pageRoute="/"
        quests={quests}
        chapters={DEMO_CHAPTERS}
        includeRoadmap
        challengeSectionMap={new Map([['done-quest', 'sec-1']])}
        onScrollToSection={onScrollToSection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { expanded: false }))

    // roadmap section
    expect(screen.getByTestId('quest-menu-roadmap')).not.toBeNull()
    expect(screen.queryByText('Landed on WOD Wiki')).not.toBeNull()
    // challenges section
    expect(screen.getByTestId('quest-menu-challenges')).not.toBeNull()
    // chapters section
    expect(screen.getByTestId('quest-menu-chapters')).not.toBeNull()
    expect(screen.queryByText('Protocols')).not.toBeNull()

    // challenge click scrolls to its section
    fireEvent.click(screen.getByText('Done quest'))
    expect(onScrollToSection).toHaveBeenCalledWith('sec-1')
  })

  it('opens on click and ignores touch hover', () => {
    const quests: Quest[] = [{ id: 'pending-quest', label: 'Pending quest' }]

    render(
      <QuestMenu
        pageRoute="/guide/demo"
        quests={quests}
        challengeSectionMap={new Map([['pending-quest', 'sec-1']])}
      />,
    )

    const badge = screen.getByRole('button', { expanded: false })

    fireEvent.pointerEnter(badge, { pointerType: 'touch' })
    expect(screen.queryByText('Pending quest')).toBeNull()

    fireEvent.click(badge)
    expect(screen.queryByText('Pending quest')).not.toBeNull()

    fireEvent.click(badge)
    expect(screen.queryByText('Pending quest')).toBeNull()
  })

  it('returns null when there are no quests and no roadmap', () => {
    const { container } = render(
      <QuestMenu
        pageRoute="/guide/demo"
        quests={[]}
        challengeSectionMap={new Map()}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('still renders on the home route when there are no page quests (roadmap only)', () => {
    render(
      <QuestMenu
        pageRoute="/"
        quests={[]}
        includeRoadmap
        challengeSectionMap={new Map()}
      />,
    )

    expect(screen.getByTestId('quest-menu-summary').textContent).toBe('1/5')
  })
})
