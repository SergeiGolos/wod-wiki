import { TourHero } from './TourHero'
import { TourJumpSection } from './TourJumpSection'
import { TourLearnSection } from './TourLearnSection'
import { TourChapterPicker } from './TourChapterPicker'
import { HomeAnalyticsSection } from './HomeAnalyticsSection'
import { TourMetricsScreen } from './screens/TourMetricsScreen'
import { TaglineHeader } from './HomeTour'
import { CaptionBody, TOUR_CAPTIONS } from './TourCaptions'
import { TOUR_ACCENTS } from './tourConstants'
import type { ScriptBlock } from '@/components/Editor/types'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'

export interface TourMobileStackProps {
  theme: string
  wodFiles?: Record<string, string>
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
  const metricsCaption = TOUR_CAPTIONS.find((c) => c.id === 'metrics-e')

  return (
    <div data-testid="tour-mobile-stack" className="flex flex-col gap-6">
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

      {/* Section 01: Write it in Markdown */}
      <section id="tour-section-write" data-testid="tour-section-write" className="flex flex-col gap-4">
        <TaglineHeader
          index="01"
          before="Write it in "
          accentText="Markdown"
          after=""
          accent={TOUR_ACCENTS.editor}
          blurb="Freeform Markdown notes, fenced ```time blocks, live type-ahead. Everything starts as plain text you can edit."
        />
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
      </section>

      {/* Section 02: Run it as a Timer */}
      <section id="tour-section-run" data-testid="tour-section-run" className="flex flex-col gap-4">
        <TaglineHeader
          index="02"
          before="Run it as a "
          accentText="Timer"
          after=""
          accent={TOUR_ACCENTS.timer}
          blurb="The script becomes the clock. Step through rounds, cast to the big screen, and pace the room together."
        />
        {timerCaption && (
          <article
            data-testid="tour-timer-card"
            className="mx-6 rounded-2xl border border-border bg-card p-6"
          >
            <CaptionBody cap={timerCaption} />
          </article>
        )}
      </section>

      {/* Section 03: Own the Metrics */}
      <section id="tour-section-own" data-testid="tour-section-own" className="flex flex-col gap-4">
        <TaglineHeader
          index="03"
          before="Own the "
          accentText="Metrics"
          after=""
          accent={TOUR_ACCENTS.analytics}
          blurb="Every movement produces facts. Metrics bind to efforts, accumulating structured workout data on every pass."
        />
        {metricsCaption && (
          <article
            data-testid="tour-metrics-card"
            className="mx-6 rounded-2xl border border-border bg-card p-6"
          >
            <CaptionBody cap={metricsCaption} />
          </article>
        )}
        <div className="mx-6 h-64 overflow-hidden rounded-2xl border border-border">
          <TourMetricsScreen activeStageId="metrics-e" />
        </div>
      </section>

      {/* Section 04: Explore your analytics */}
      <section id="tour-section-explore" data-testid="tour-section-explore" className="flex flex-col gap-4">
        <TaglineHeader
          index="04"
          before=""
          accentText="Explore"
          after=" your analytics"
          accent={TOUR_ACCENTS.rounds}
          blurb="Query what you just did in WQL. Roll up totals, graph volume over time, and build custom dashboards."
        />
        <HomeAnalyticsSection />
      </section>

      {/* Syntax chapter picker */}
      <TourChapterPicker wodFiles={props.wodFiles ?? {}} theme={props.theme} />

      {/* High-level progress */}
      <TourLearnSection
        quests={props.quests}
        chapters={props.chapters}
        questLabels={props.questLabels}
        onHomeQuestClick={props.onHomeQuestClick}
      />
    </div>
  )
}
