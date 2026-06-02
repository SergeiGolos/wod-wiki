import React from 'react'
import { cn } from '@/lib/utils'
import type { CanvasSection as CanvasSectionType } from '../../canvas/parseCanvasMarkdown'
import {
  isFullBleed,
  isDark,
  getSectionDensity,
  getSectionThemeStyles,
} from '../../canvas/canvasSectionUtils'
import { buttonToActivation } from '../../nav/navTypes'
import type { NavActionDeps } from '../../nav/navTypes'
import { CanvasProse } from '../../canvas/CanvasProse'
import { SectionButtons } from './SectionButtons'
import { ExampleTabs } from './ExampleTabs'
import type { RunButtonState } from './SectionButtons'

interface CanvasSectionProps {
  section: CanvasSectionType
  idx: number
  prose?: string
  blockId: string
  keySuffix: string
  showHeading?: boolean
  showEyebrow?: boolean
  renderButtons?: boolean
  isActive?: boolean
  hasViewDef?: boolean
  runState?: RunButtonState
  deps: NavActionDeps
  onExampleSelect: (section: CanvasSectionType, index: number) => void
  selectedExampleIndex: number
}

export const CanvasSection: React.FC<CanvasSectionProps> = ({
  section,
  idx,
  prose,
  blockId,
  keySuffix,
  showHeading = true,
  showEyebrow = true,
  renderButtons = true,
  isActive = false,
  hasViewDef = false,
  runState,
  deps,
  onExampleSelect,
  selectedExampleIndex,
}) => {
  const fullBleed = isFullBleed(section)
  const dark = isDark(section)
  const density = getSectionDensity(section)
  const sectionTheme = getSectionThemeStyles(section)
  const trimmedProse = prose?.trim() ?? ''
  const examples = section.examples ?? []

  return (
    <div
      key={`${section.id}-${keySuffix}`}
      id={blockId}
      data-section-id={keySuffix === 'default' || keySuffix === 'before-workouts' ? section.id : undefined}
      className={cn(
        'group relative border-b border-border/50 transition-colors duration-300',
        hasViewDef
          ? fullBleed
            ? 'min-h-[35vh] flex items-center justify-center py-12 lg:py-16 px-6 lg:px-10'
            : density === 'compact'
              ? 'py-10 lg:py-12 px-6 lg:px-10'
              : 'py-14 lg:py-20 px-6 lg:px-10'
          : density === 'compact'
            ? 'py-10 lg:py-12 px-6 lg:px-12'
            : 'py-16 lg:py-20 px-6 lg:px-12',
        dark && 'bg-muted/20 overflow-hidden',
        !dark && !fullBleed && (idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.18]'),
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b opacity-0 transition-opacity duration-300',
          sectionTheme.accent,
          isActive && 'opacity-100',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 h-full w-1 origin-top rounded-r-full bg-gradient-to-b transition-all duration-300',
          sectionTheme.progress,
          isActive ? 'scale-y-100 opacity-100' : 'scale-y-[0.18] opacity-25',
        )}
      />
      {dark && (
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      )}

      <div className={cn(
        'relative',
        hasViewDef
          ? fullBleed ? 'max-w-md w-full text-center' : 'max-w-sm'
          : 'max-w-4xl w-full mx-auto',
      )}>
        {showEyebrow && (!fullBleed || !hasViewDef) && (
          <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
            {String(idx + 1).padStart(2, '0')}
          </div>
        )}

        {showHeading ? (
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
            {section.heading}
          </h2>
        ) : null}

        {trimmedProse ? <CanvasProse prose={trimmedProse} className="mb-6" /> : null}

        {examples.length > 0 ? (
          <ExampleTabs
            examples={examples}
            activeIndex={Math.min(selectedExampleIndex, examples.length - 1)}
            onSelect={(index) => onExampleSelect(section, index)}
          />
        ) : null}

        {renderButtons ? (
          <SectionButtons
            activations={section.buttons.map((b, i) => buttonToActivation(b, i))}
            fullBleed={fullBleed}
            runState={hasViewDef ? runState : undefined}
            deps={deps}
          />
        ) : null}
      </div>
    </div>
  )
}
