import React from 'react'
import { getSectionProse, type CanvasSection } from '../../../canvas/parseCanvasMarkdown'
import type { WorkoutItem } from '../../../App'
import { CanvasSection as CanvasSectionComponent } from '../../molecules/CanvasSection'
import { HeroCarousel, HERO_CAROUSEL_TOKEN } from '../../organisms/landing/HeroCarousel'
import type { RunButtonState } from '../../molecules/SectionButtons'
import type { NavActionDeps } from '../../../nav/navTypes'

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
        const sectionProse = getSectionProse(section);
        const hasHeroCarousel = sectionProse.includes(HERO_CAROUSEL_TOKEN);

        if (hasHeroCarousel) {
          const [beforeProse = '', afterProse = ''] = sectionProse.split(HERO_CAROUSEL_TOKEN);
          return (
            <div
              key={`${section.id}-hero`}
              id={section.id}
              className="border-b border-border/50 bg-card"
            >
              <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                {beforeProse.trim() && (
                  <div className="prose-canvas mb-6 max-w-3xl">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{beforeProse.trim()}</pre>
                  </div>
                )}
                <HeroCarousel />
                {afterProse.trim() && (
                  <div className="prose-canvas mt-6 max-w-3xl">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{afterProse.trim()}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (isCollection && collectionSlug && workoutItems && getSectionProse(section).includes('{{workouts}}')) {
          const [beforeProse = '', afterProse = ''] = getSectionProse(section).split('{{workouts}}')
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
            prose={sectionProse}
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
