import { useEffect, useState } from 'react'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { TourHero } from './TourHero'
import { TourShortCircuitStrip } from './TourShortCircuitStrip'
import { TourLearnSection } from './TourLearnSection'
import { TourRegistrySection } from './TourRegistrySection'
import { TourReferenceSection } from './TourReferenceSection'
import { TelemetryConsentFooter } from './TelemetryConsentFooter'
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
  onOpenInEditor: () => void
}

export function TourMobileStack(props: TourMobileStackProps) {
  const timerCaption = TOUR_CAPTIONS.find((c) => c.id === 'timer')
  const analyticsCaption = TOUR_CAPTIONS.find((c) => c.id === 'analytics')

  // Spec §2: mobile Explore Your Data card degrades to a single stat.
  const [weekFacts, setWeekFacts] = useState<number | undefined>(undefined)
  useEffect(() => {
    const end = Date.now()
    let cancelled = false
    void indexedDBService
      .getFactsByTimeRange(end - 7 * 86_400_000, end)
      .then((facts) => {
        if (!cancelled) setWeekFacts(facts.length)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-testid="tour-mobile-stack" className="flex flex-col gap-4">
      <TourHero
        theme={props.theme}
        doc={props.doc}
        onDocChange={props.onDocChange}
        onBlocksChange={props.onBlocksChange}
        onRun={props.onRun}
        onShare={props.onShare}
        onOpenInEditor={props.onOpenInEditor}
      />
      <TourShortCircuitStrip />
      <TourLearnSection
        quests={props.quests}
        chapters={props.chapters}
        questLabels={props.questLabels}
        onHomeQuestClick={props.onHomeQuestClick}
      />

      {timerCaption && (
        <article
          data-testid="tour-timer-card"
          className="mx-6 rounded-2xl border border-border bg-card p-6"
        >
          <CaptionBody cap={timerCaption} />
        </article>
      )}

      {analyticsCaption && (
        <article
          data-testid="tour-analytics-card"
          className="mx-6 rounded-2xl border border-border bg-card p-6"
        >
          <CaptionBody cap={analyticsCaption} />
          {weekFacts !== undefined && (
            <div className="mt-4">
              <div className="text-3xl font-black text-foreground">{weekFacts}</div>
              <div className="text-xs text-muted-foreground">
                facts logged in the last 7 days
              </div>
            </div>
          )}
        </article>
      )}

      <TourRegistrySection />
      <TourReferenceSection />
      <TelemetryConsentFooter />
    </div>
  )
}
