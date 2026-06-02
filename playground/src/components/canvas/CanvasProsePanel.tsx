import React from 'react'
import type { CanvasSection } from '../../canvas/parseCanvasMarkdown'
import type { WorkoutItem } from '../../App'
import { CollectionWorkoutsList } from '../../views/queriable-list/CollectionWorkoutsList'
import { CanvasSection as CanvasSectionComponent } from './CanvasSection'
import type { RunButtonState } from './SectionButtons'
import type { NavActionDeps } from '../../nav/navTypes'

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
}) => {
  const renderCollectionListSection = (key: string) => (
    <div
      key={key}
      id="collection-workouts"
      className="border-b border-border/50 bg-card"
    >
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
  )

  return (
    <>
      {mobilePanel}
      {heroSlot}

      {contentSections.map((section, idx) => {
        if (isCollection && collectionSlug && workoutItems && section.prose.includes('{{workouts}}')) {
          const [beforeProse = '', afterProse = ''] = section.prose.split('{{workouts}}')
          return [
            <CanvasSectionComponent
              key={`${section.id}-before-workouts`}
              section={section}
              idx={idx}
              prose={beforeProse}
              blockId={section.id}
              keySuffix="before-workouts"
              renderButtons={false}
              isActive={activeSectionId === section.id}
              hasViewDef={hasViewDef}
              runState={runState}
              deps={deps}
              onExampleSelect={handleExampleSelect}
              selectedExampleIndex={selectedExamples[section.id] ?? 0}
            />,
            renderCollectionListSection(`${section.id}-workouts`),
            afterProse.trim() || section.buttons.length > 0 ? (
              <CanvasSectionComponent
                key={`${section.id}-after-workouts`}
                section={section}
                idx={idx}
                prose={afterProse}
                blockId={`${section.id}-after`}
                keySuffix="after-workouts"
                showHeading={false}
                showEyebrow={false}
                isActive={activeSectionId === section.id}
                hasViewDef={hasViewDef}
                runState={runState}
                deps={deps}
                onExampleSelect={handleExampleSelect}
                selectedExampleIndex={selectedExamples[section.id] ?? 0}
              />
            ) : null,
          ]
        }

        return (
          <CanvasSectionComponent
            key={`${section.id}-default`}
            section={section}
            idx={idx}
            prose={section.prose}
            blockId={section.id}
            keySuffix="default"
            isActive={activeSectionId === section.id}
            hasViewDef={hasViewDef}
            runState={runState}
            deps={deps}
            onExampleSelect={handleExampleSelect}
            selectedExampleIndex={selectedExamples[section.id] ?? 0}
          />
        )
      })}

      {isCollection && !hasWorkoutsTag && collectionSlug && workoutItems && (
        renderCollectionListSection('collection-workouts-fallback')
      )}
    </>
  )
}
