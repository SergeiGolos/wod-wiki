/**
 * TourCaptions.tsx — per-stage captions for the walkthrough.
 *
 * Desktop: a fixed-width column where captions cross-fade with the active
 * stage. Mobile: the parent translates the strip vertically (scrubbed
 * during the last 30% of each stage) or the cards render statically. The
 * same CAPTIONS data now carries the stage drop-off actions for the home
 * funnel.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TOUR_ACCENTS, type TourStageId } from './tourStages'
import { telemetry, HOME_EVENTS, type HomeEventName } from '@/services/telemetry'
import { analyticsExplorerPath } from '../lib/routes'

export interface TourCaptionAction {
  label: string
  href: string
  event: HomeEventName
}

export interface TourCaption {
  id: TourStageId
  num: string
  title: ReactNode
  body: string
  foot: string
  accent: string
  actions?: TourCaptionAction[]
}

export const TOUR_CAPTIONS: TourCaption[] = [
  {
    id: 'timer',
    num: '01 / 02 — The Timer',
    title: (
      <>
        What Happens When It Runs.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>The script becomes the clock.</em>
      </>
    ),
    body: 'The WallClock runs your exact script — while it captures reps, pace and volume as you go. One tap casts the whole thing to a Chromecast, and your phone stays the remote.',
    foot: 'WallClock · Chromecast · live metric capture',
    accent: TOUR_ACCENTS.timer,
    actions: [
      {
        label: 'Read the behaviors explainer',
        href: '/guide/behaviors',
        event: HOME_EVENTS.behaviorsOpened,
      },
    ],
  },
  {
    id: 'analytics',
    num: '02 / 02 — Explore Your Data',
    title: (
      <>
        Explore Your Data.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>Query what you just did.</em>
      </>
    ),
    body: 'The moment the timer completes — or you hit stop — splits, volume and every captured metric are written into the day\u2019s journal entry. Then query it, compare it, and share it.',
    foot: 'Explorer · Dashboard · Movement Registry',
    accent: TOUR_ACCENTS.analytics,
    actions: [
      {
        label: 'Run a pre-filled query',
        href: analyticsExplorerPath({ q: 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)' }),
        event: HOME_EVENTS.explorerOpened,
      },
      {
        label: 'Open the dashboard',
        href: '/analytics/dashboard',
        event: HOME_EVENTS.dashboardViewed,
      },
      {
        label: 'Read the query guide',
        href: '/guide/analytics',
        event: HOME_EVENTS.analyticsGuideOpened,
      },
    ],
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
      {cap.actions && cap.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {cap.actions.map((action, i) => {
            const isPrimary = i === 0
            return (
              <Link
                key={action.label}
                to={action.href}
                onClick={() => telemetry.record(action.event)}
                className={
                  isPrimary
                    ? 'inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
                    : 'text-sm text-primary underline-offset-2 hover:underline'
                }
              >
                {action.label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
