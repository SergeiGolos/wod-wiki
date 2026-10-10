import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Cloud, GitFork, MonitorSmartphone } from 'lucide-react'
import { resetUserData } from '../../services/resetUserData'
import { ROUTE_PATTERNS, noteByIdPath } from '../../lib/routes'
import { getTodayDateKey } from '../../services/dateUtils'
import { journalNotes } from '../../services/journalNotes'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { TaglineHeader } from '../../tour/TaglineHeader'
import { TOUR_ACCENTS } from '../../tour/tourConstants'

// ponytail: form is a Google Form — swap for an in-app interest endpoint
// when the API grows one.
const REPO_URL = 'https://github.com/SergeiGolos/wod-wiki'
const FORM_URL = 'https://forms.gle/6YHpxwAJh6PAsyAQ6'

const quietLink = 'underline-offset-4 transition-colors hover:text-foreground hover:underline'

function CardLink(props: { to?: string; href?: string; onClick?: () => void; children: React.ReactNode }) {
  const className = 'inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition-colors hover:underline'
  const inner = (
    <>
      {props.children}
      <ArrowRight className="size-3.5 text-muted-foreground/50" aria-hidden />
    </>
  )
  if (props.href !== undefined) {
    return (
      <a href={props.href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  if (props.onClick !== undefined) {
    return (
      <button type="button" onClick={props.onClick} className={`text-left ${className}`}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={props.to!} className={className}>
      {inner}
    </Link>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm leading-6 text-muted-foreground">
      <span aria-hidden className="mt-[11px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
      <span>{children}</span>
    </li>
  )
}

/** Line-rendering timer scene — monochrome token strokes, no fills. */
function OfferingBanner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1500 170"
      className="h-40 w-full"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
      strokeLinecap="round"
    >
      {/* stopwatch dial */}
      <g stroke="hsl(var(--muted-foreground))">
        <circle cx="750" cy="95" r="62" strokeOpacity="0.55" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6
          const x1 = 750 + Math.cos(a) * 54
          const y1 = 95 + Math.sin(a) * 54
          const x2 = 750 + Math.cos(a) * 62
          const y2 = 95 + Math.sin(a) * 62
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity="0.35" />
        })}
        {/* elapsed sweep (accent) + hand */}
        <path d="M 750 23 A 72 72 0 0 1 812 40" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="4 7" strokeOpacity="0.8" />
        <line x1="750" y1="95" x2="785" y2="55" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeOpacity="0.9" />
        <circle cx="750" cy="95" r="4" fill="hsl(var(--primary))" fillOpacity="0.9" stroke="none" />
        {/* crown + side button */}
        <rect x="740" y="14" width="20" height="11" rx="3" strokeOpacity="0.55" strokeWidth="2" />
        <line x1="804" y1="44" x2="816" y2="32" strokeOpacity="0.55" strokeWidth="2" />
      </g>
      {/* kettlebell */}
      <g stroke="hsl(var(--muted-foreground))" strokeOpacity="0.5" strokeWidth="2">
        <circle cx="200" cy="96" r="26" />
        <path d="M 184 74 q 16 -26 32 0" />
      </g>
      {/* barbell */}
      <g stroke="hsl(var(--muted-foreground))" strokeOpacity="0.5" strokeWidth="2">
        <line x1="1230" y1="86" x2="1330" y2="86" />
        <rect x="1218" y="68" width="14" height="36" rx="5" />
        <rect x="1328" y="68" width="14" height="36" rx="5" />
      </g>
      {/* floor line */}
      <line x1="140" y1="150" x2="1360" y2="150" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2 10" />
    </svg>
  )
}

function OfferingCard(props: {
  icon: typeof Cloud
  title: string
  text: string
  children: React.ReactNode
}) {
  const Icon = props.icon
  return (
    <article className="flex flex-col rounded-xl border border-border bg-background p-5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{props.title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{props.text}</p>
      <div className="mt-4 flex flex-1 flex-col gap-2 text-sm">{props.children}</div>
    </article>
  )
}

export function OfferingTiers() {
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()

  const clearData = async () => {
    if (!window.confirm('Wipe every note, result, and setting stored in this browser? This cannot be undone.')) return
    setClearing(true)
    await resetUserData()
    window.location.reload()
  }

  const createJournal = async () => {
    const today = getTodayDateKey()
    const note = await journalNotes.create({ journalDate: today, title: today, rawContent: '' })
    telemetry.record(HOME_EVENTS.noteCreated)
    navigate(noteByIdPath(note.id))
  }

  return (
    <section id="tour-section-offerings" data-testid="tour-section-offerings" aria-label="Ways to run Wod Wiki">
      <TaglineHeader
        index="06"
        before="Run it "
        accentText="your way"
        after=""
        accent={TOUR_ACCENTS.library}
        blurb="One journal, three homes. Keep it in this browser, run the open-source server yourself, or let us host it — pick the custody model that fits."
      />

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1720px] px-6 pb-16 pt-10 lg:px-12 xl:px-16">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-6 pt-3">
          <OfferingBanner />
        </div>

        <div className="relative z-10 mx-auto -mt-14 grid max-w-5xl grid-cols-1 gap-5 px-1 md:grid-cols-3">
          <OfferingCard
            icon={MonitorSmartphone}
            title="In this browser"
            text="Your journal lives on this device — no account, no server copy."
          >
            <CardLink onClick={() => void createJournal()}>Create your journal</CardLink>
            <CardLink to={ROUTE_PATTERNS.playgroundRoot}>Start Writing in a Playground</CardLink>
            <CardLink to="/feeds">Explore the feeds</CardLink>
            <button
              type="button"
              onClick={clearData}
              disabled={clearing}
              className={`mt-1 text-left text-xs text-muted-foreground disabled:opacity-50 ${quietLink}`}
            >
              {clearing ? 'Clearing…' : 'Clear my data'}
            </button>
          </OfferingCard>

          <OfferingCard
            icon={GitFork}
            title="Self-hosted"
            text="Open source — run your own copy on your own infrastructure."
          >
            <CardLink href={REPO_URL}>View source</CardLink>
            <span className="text-xs leading-5 text-muted-foreground">
              One Bun server backed by a local SQLite file, Turso, or Postgres — run it yourself, keep every byte.
            </span>
          </OfferingCard>

          <OfferingCard
            icon={Cloud}
            title="Hosted by wod.wiki"
            text="We run it for you as custodians — your data stays yours. Plans are still taking shape."
          >
            <ul className="space-y-1.5">
              <Bullet>Safe cloud storage and a personal page URL with a public feed.</Bullet>
              <Bullet>Website hosting for your gym.</Bullet>
              <Bullet>Coaches portal — aggregate athlete data, dashboards, competition timers.</Bullet>
              <Bullet>Athlete portal — private journals that roll up to their coach.</Bullet>
            </ul>
            <div className="mt-auto pt-2">
              <CardLink href={FORM_URL}>Answer the questionnaire</CardLink>
              <span className="mt-1 block text-xs text-muted-foreground">
                Two minutes — same form for athletes, gyms, and coaches.
              </span>
            </div>
          </OfferingCard>
        </div>
      </div>
    </section>
  )
}
