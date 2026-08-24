import { TourHero } from './TourHero'
import { TourJumpSection } from './TourJumpSection'
import { TourLearnSection } from './TourLearnSection'
import { HomeAnalyticsSection } from './HomeAnalyticsSection'
import { CaptionBody, TOUR_CAPTIONS } from './TourCaptions'
import type { ScriptBlock } from '@/components/Editor/types'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'

export interface TourMobileStackProps {
  theme: string
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  /** Choose-your-own-adventure workout choice from the editor-blank caption card. */
  onChoice?: (wod: string) => void
  /** Shared-script attribution + reset, forwarded to the hero editor (#882). */
  sharedBy?: string
  onResetShared?: () => void
}

export function TourMobileStack(props: TourMobileStackProps) {
  const editorBlankCaption = TOUR_CAPTIONS.find((c) => c.id === 'editor-blank')
  const editorMetricsCaption = TOUR_CAPTIONS.find((c) => c.id === 'editor-metrics')
  const timerCaption = TOUR_CAPTIONS.find((c) => c.id === 'timer-wallclock')

  return (
    <div data-testid="tour-mobile-stack" className="flex flex-col gap-4">
      <TourHero
        theme={props.theme}
        doc={props.doc}
        onDocChange={props.onDocChange}
        onBlocksChange={props.onBlocksChange}
        onRun={props.onRun}
        onShare={props.onShare}
        sharedBy={props.sharedBy}
        onResetShared={props.onResetShared}
      />
      <TourJumpSection />

      {editorBlankCaption && (
        <article
          data-testid="tour-editor-card"
          className="mx-6 rounded-2xl border border-border bg-card p-6"
        >
          <CaptionBody cap={editorBlankCaption} onChoice={props.onChoice} />
        </article>
      )}
      {editorMetricsCaption && (
        <article
          data-testid="tour-editor-metrics-card"
          className="mx-6 rounded-2xl border border-border bg-card p-6"
        >
          <CaptionBody cap={editorMetricsCaption} />
        </article>
      )}
      {timerCaption && (
        <article
          data-testid="tour-timer-card"
          className="mx-6 rounded-2xl border border-border bg-card p-6"
        >
          <CaptionBody cap={timerCaption} />
        </article>
      )}

      {/* WQL-elements analytics showcase (#938) — static, so reduced-motion
          renders it as-is in the flat stack. */}
      <HomeAnalyticsSection />
      <TourLearnSection
        quests={props.quests}
        chapters={props.chapters}
        questLabels={props.questLabels}
        onHomeQuestClick={props.onHomeQuestClick}
      />


    </div>
  )
}
