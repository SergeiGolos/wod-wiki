/**
 * RunwayAdapter.tsx — the unified sticky-demo adapter (#936). ONE ```scroll
 * spec through ONE stage-resolution seam (`resolveScrollStage → ScrollSlice`),
 * swapped across the three Form Factor presentations:
 *
 *   desktop → ScrollRunwaySection  (slide runway; scroll-progress driver)
 *   mobile  → RunwayMobile         (pinned window; card-visibility driver)
 *   reduced → RunwayReduced        (flat static-card stack; IO stage-enter)
 *
 * The adapter decides Form Factor — nothing downstream self-detects the
 * breakpoint or the motion preference. This is the single presentation the
 * Page Composer (#933) swaps across desktop / mobile / reduced-motion, and the
 * spec-driven replacement for the tour-coupled `TourMobileRunway` pattern.
 * Validated in the /proto/runway-adapter prototype.
 */
import type { ScriptBlock } from '@/components/Editor/types'
import type { ScrollSpec } from './parseCanvasMarkdown'
import { useCanvasFormFactor, type CanvasFormFactor } from './useCanvasFormFactor'
import { ScrollRunwaySection } from './ScrollRunwaySection'
import { RunwayMobile } from './RunwayMobile'
import { RunwayReduced } from './RunwayReduced'

/** The three Form Factor presentations the adapter swaps across. */
export type RunwayFormFactor = CanvasFormFactor

/**
 * Detect the current Form Factor: reduced-motion wins, then the mobile
 * breakpoint, else desktop. Used when no explicit `formFactor` is supplied —
 * the Page Composer will pass one from context; standalone hosts (guides, the
 * home chapter tour) can rely on detection.
 */
export function useRunwayFormFactor(): RunwayFormFactor {
  return useCanvasFormFactor()
}

export interface RunwayAdapterProps {
  spec: ScrollSpec
  /** Explicit Form Factor. Omit to auto-detect via `useRunwayFormFactor`. */
  formFactor?: RunwayFormFactor
  wodFiles: Record<string, string>
  theme: string
  /** Window-chrome title (e.g. `chapters.md`). */
  noteTitle?: string
  /**
   * Controlled editor document. When provided (with `onDocChange`), the host
   * owns the runway's document — e.g. ScrollCanvasPage, whose trailing-section
   * buttons (`swapSource`) and Run/runtime read it. Omit for an uncontrolled
   * runway (e.g. the home chapter tour).
   */
  doc?: string
  onDocChange?: (doc: string) => void
  /** Fired when the runway's compiled blocks change (feeds the host's live block). */
  onBlocksChange?: (blocks: ScriptBlock[]) => void
  /** Fired when a stage enters. Wire chapter quest completion / telemetry. */
  onStageEnter?: (stageId: string) => void
  /** Run handler — opens the host's runtime. When omitted, Run is hidden. */
  onRun?: (doc: string, block: ScriptBlock | null) => void
  className?: string
}

export function RunwayAdapter({
  spec,
  formFactor,
  wodFiles,
  theme,
  noteTitle,
  doc,
  onDocChange,
  onBlocksChange,
  onStageEnter,
  onRun,
  className,
}: RunwayAdapterProps) {
  const detected = useRunwayFormFactor()
  const ff = formFactor ?? detected

  if (ff === 'mobile') {
    return (
      <RunwayMobile
        spec={spec}
        wodFiles={wodFiles}
        theme={theme}
        noteTitle={noteTitle}
        doc={doc}
        onDocChange={onDocChange}
        onBlocksChange={onBlocksChange}
        onStageEnter={onStageEnter}
        onRun={onRun}
        className={className}
      />
    )
  }
  if (ff === 'reduced') {
    return <RunwayReduced spec={spec} wodFiles={wodFiles} onStageEnter={onStageEnter} className={className} />
  }
  return (
    <ScrollRunwaySection
      scroll={spec}
      wodFiles={wodFiles}
      theme={theme}
      noteTitle={noteTitle}
      doc={doc}
      onDocChange={onDocChange}
      onBlocksChange={onBlocksChange}
      onStageEnter={onStageEnter}
      onRun={onRun}
      className={className}
    />
  )
}
