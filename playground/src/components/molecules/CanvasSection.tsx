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
  const examples = section.examples ?? []
  const isHero = idx === -1

  // When the parent supplies an override `prose` string (e.g. the
  // `{{workouts}}` split in collection mode), we render it as a single
  // chunk and fall back to the bottom button group. Otherwise we use the
  // parser's `proseChunks`, which already interleave each button with the
  // paragraph it was authored under.
  const useInlineChunks = prose === undefined
  const chunks = useInlineChunks
    ? section.proseChunks
    : [{ kind: 'prose' as const, text: prose }]
  const renderBottomButtonGroup = !useInlineChunks && section.buttons.length > 0

  return (
    <div
      key={`${section.id}-${keySuffix}`}
      id={blockId}
      data-section-id={keySuffix === 'default' || keySuffix === 'before-workouts' ? section.id : undefined}
      className={cn(
        'group relative border-b border-border/50 transition-colors duration-300',
        hasViewDef
          ? fullBleed
            ? cn(
                'flex items-center justify-center px-6 lg:px-10',
                isHero ? 'min-h-[70vh] lg:min-h-[80vh] py-16 lg:py-24' : 'min-h-[35vh] py-12 lg:py-16',
              )
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

        {chunks.map((chunk, chunkIdx) => {
          if (chunk.kind === 'prose') {
            const text = chunk.text.trim()
            if (!text) return null
            // Tighter spacing on the first prose chunk so it hugs the heading;
            // subsequent chunks get a top margin so a button following prose
            // reads as a continuation of the same paragraph block.
            return (
              <CanvasProse
                key={`prose-${chunkIdx}`}
                prose={text}
                className={chunkIdx === 0 ? 'mb-6' : 'mt-4 mb-6'}
              />
            )
          }
          // chunk.kind === 'button'
          return (
            <SectionButtons
              key={`button-${chunkIdx}`}
              activations={[buttonToActivation(chunk.button, chunkIdx)]}
              fullBleed={fullBleed}
              runState={hasViewDef ? runState : undefined}
              deps={deps}
            />
          )
        })}

        {examples.length > 0 ? (
          <ExampleTabs
            examples={examples}
            activeIndex={Math.min(selectedExampleIndex, examples.length - 1)}
            onSelect={(index) => onExampleSelect(section, index)}
          />
        ) : null}

        {renderButtons && renderBottomButtonGroup ? (
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
