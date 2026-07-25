/**
 * TourCaptions.tsx — per-stage captions for the walkthrough.
 *
 * Desktop: a fixed-width column where captions cross-fade with the active
 * stage. Mobile: the parent translates the strip vertically (scrubbed
 * during the last 30% of each stage). The same CAPTIONS data drives the
 * reduced-motion static card fallback.
 */

import type { ReactNode } from 'react'
import { TOUR_ACCENTS, type TourStageId } from './tourStages'

export interface TourCaption {
  id: TourStageId
  num: string
  title: ReactNode
  body: string
  foot: string
  accent: string
}

export const TOUR_CAPTIONS: TourCaption[] = [
  {
    id: 'overview',
    num: 'The Loop',
    title: (
      <>
        One window. <em className="not-italic" style={{ color: TOUR_ACCENTS.ink }}>The whole workout lifecycle.</em>
      </>
    ),
    body: 'A note, a clock, a journal and a library that all speak the same plain-text language. Scroll to walk the four parts of the app.',
    foot: 'wod.wiki — whiteboard-script playground',
    accent: TOUR_ACCENTS.ink,
  },
  {
    id: 'editor',
    num: '01 / 04 — The Editor',
    title: (
      <>
        Write the workout. <em className="not-italic" style={{ color: TOUR_ACCENTS.editor }}>It&rsquo;s just Markdown.</em>
      </>
    ),
    body: 'The note view is where workouts are authored in whiteboard-script: (3 Rounds), 10 Pushups, *:30 Rest. The ```wod block compiles as you type — swap a load, add a round, and the plan updates before you lift a finger.',
    foot: 'Rounds · rep schemes · sections · rest timers',
    accent: TOUR_ACCENTS.editor,
  },
  {
    id: 'timer',
    num: '02 / 04 — The Timer',
    title: (
      <>
        Press Run. <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>The script becomes the clock.</em>
      </>
    ),
    body: 'The WallClock runs your exact script — while it captures reps, pace and volume as you go. Keep scrolling: one tap casts the whole thing to a Chromecast, and your phone stays the remote.',
    foot: 'Live metric capture · cast to any TV',
    accent: TOUR_ACCENTS.timer,
  },
  {
    id: 'analytics',
    num: '03 / 04 — The Analytics',
    title: (
      <>
        Clock stops. <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>The numbers land.</em>
      </>
    ),
    body: 'The moment the timer completes — or you hit stop — splits, volume and every captured metric are written into the day\u2019s journal entry. Your history is yours: queryable, comparable, still plain text.',
    foot: 'Round splits · totals · per-movement metrics',
    accent: TOUR_ACCENTS.analytics,
  },
  {
    id: 'library',
    num: '04 / 04 — Collections & Feeds',
    title: (
      <>
        Or don&rsquo;t write <em className="not-italic" style={{ color: TOUR_ACCENTS.library }}>anything at all.</em>
      </>
    ),
    body: 'Dozens of bundled collections — Games archives, the benchmark Girls, Dan John, Girevoy Sport — plus feeds that drop a programmed WOD into your journal every day. Pick one, press Run, and the whole loop above just works.',
    foot: 'Bundled collections · daily programmed feeds',
    accent: TOUR_ACCENTS.library,
  },
]

export interface TourCaptionsProps {
  /** Index into TOUR_CAPTIONS (matches stage index). */
  activeIndex: number
}

/** Desktop cross-fading caption column. */
export function TourCaptions({ activeIndex }: TourCaptionsProps) {
  return (
    <div className="relative w-[330px] flex-none min-h-[280px]" data-testid="tour-captions">
      {TOUR_CAPTIONS.map((cap, i) => (
        <div
          key={cap.id}
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
          aria-hidden={i !== activeIndex}
        >
          <CaptionBody cap={cap} />
        </div>
      ))}
    </div>
  )
}

export function CaptionBody({ cap }: { cap: TourCaption }) {
  return (
    <>
      <div
        className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em]"
        style={{ color: cap.accent }}
      >
        {cap.num}
      </div>
      <h3 className="mb-3.5 text-[clamp(22px,2vw,30px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
        {cap.title}
      </h3>
      <p className="text-[14.5px] leading-[1.7] text-muted-foreground">{cap.body}</p>
      <div className="mt-4 border-t border-border pt-3 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/60">
        {cap.foot}
      </div>
    </>
  )
}
