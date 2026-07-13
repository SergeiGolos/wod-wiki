import React from 'react'
import { type CanvasSection, type Chapter } from '../../../canvas/parseCanvasMarkdown'
import type { WorkoutItem } from '../../../App'
import { CanvasSection as CanvasSectionComponent } from '../../molecules/CanvasSection'
import { CollectionWorkoutsList } from '../../../views/queriable-list/CollectionWorkoutsList'
import type { RunButtonState } from '../../molecules/SectionButtons'
import type { NavActionDeps } from '../../../nav/navTypes'
import type { Quest } from '../../../hooks/usePageQuests'

interface CanvasProsePanelProps {
  heroSlot?: React.ReactNode
  mobilePanel?: React.ReactNode
  contentSections: CanvasSection[]
  isCollection: boolean
  collectionSlug: string | null
  workoutItems: WorkoutItem[] | undefined
  handleSelectWorkout: (item: WorkoutItem) => void
  activeSectionId: string | null
  selectedExamples: Record<string, number>
  runState?: RunButtonState
  deps: NavActionDeps
  handleExampleSelect: (section: CanvasSection, index: number) => void
  hasWorkoutsTag: boolean
  hasViewDef: boolean
  chapters?: Chapter[]
  challengeQuests?: Array<Quest & { isCompleted: boolean }>
}

export const CanvasProsePanel: React.FC<CanvasProsePanelProps> = ({
  heroSlot,
  mobilePanel,
  contentSections,
  isCollection,
  collectionSlug,
  workoutItems,
  handleSelectWorkout,
  activeSectionId,
  selectedExamples,
  runState,
  deps,
  handleExampleSelect,
  hasWorkoutsTag,
  hasViewDef,
  chapters = [],
  challengeQuests = [],
}) => {
  return (
    <>
      {mobilePanel}
      {heroSlot}
      {contentSections.map((section, idx) => (
        <CanvasSectionComponent
          key={`${section.id}-default`}
          section={section}
          idx={idx}
          blockId={section.id}
          keySuffix="default"
          isActive={activeSectionId === section.id}
          hasViewDef={hasViewDef}
          runState={runState}
          deps={deps}
          onExampleSelect={handleExampleSelect}
          selectedExampleIndex={selectedExamples[section.id] ?? 0}
          chapters={chapters}
          challengeQuests={challengeQuests}
          isCollection={isCollection}
          collectionSlug={collectionSlug}
          workoutItems={workoutItems}
          handleSelectWorkout={handleSelectWorkout}
        />
      ))}

      {isCollection && !hasWorkoutsTag && collectionSlug && workoutItems && (
        <div id="collection-workouts" className="border-b border-border/50 bg-card">
          <div className="w-full mx-auto">
            <CollectionWorkoutsList
              category={collectionSlug ?? ''}
              workoutItems={workoutItems ?? []}
              onSelect={handleSelectWorkout}
              showSearch={false}
              variant="flat"
            />
          </div>
        </div>
      )}
    </>
  )
}
