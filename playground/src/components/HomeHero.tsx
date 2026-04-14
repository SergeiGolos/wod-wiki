import { useRef } from 'react'
import { ChevronDown, PenLine, Timer, BarChart2 } from 'lucide-react'

const STICKY_NAV_HEIGHT = 104

function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT
  window.scrollTo({ top, behavior: motionOk ? behavior : 'auto' })
}

const HERO_CARDS = [
  {
    id: 'editor',
    icon: <PenLine className="size-5" />,
    label: 'Plan',
    title: 'Write workouts in Markdown',
    copy: 'Draft, format, and share workouts as fast as you can type — no forms, no friction.',
  },
  {
    id: 'tracker',
    icon: <Timer className="size-5" />,
    label: 'Execute',
    title: 'Integrated timer keeps pace',
    copy: 'Your scripted workout comes to life. Hit Start and let the app keep the pace while you focus on the work.',
  },
  {
    id: 'review',
    icon: <BarChart2 className="size-5" />,
    label: 'Evolve',
    title: 'Data-driven performance insights',
    copy: 'Every lap tracked becomes insight. Analyse trends, visualise progress, and make informed adjustments.',
  },
]

export function HomeHero() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric gradient wash — green cloud behind hero */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(24,226,153,0.18) 0%, rgba(24,226,153,0.06) 40%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28 flex flex-col items-center text-center">

        {/* Label pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-pill border border-black/5 bg-brand-light px-3 py-1 dark:border-white/8 dark:bg-brand/10">
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-mono text-brand-deep dark:text-brand"
          >
            Workout Studio
          </span>
        </div>

        {/* Hero headline */}
        <h1
          className="max-w-3xl text-[2.5rem] font-semibold leading-[1.1] tracking-heading text-foreground sm:text-[3.5rem] lg:text-[4rem] lg:tracking-display"
        >
          The workout studio built for fitness enthusiasts.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-xl text-lg font-normal leading-[1.5] text-muted-foreground">
          Plan with Markdown, execute with a precision timer, and evolve with performance insights — all in one place.
        </p>

        {/* CTA row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => scrollToSection('editor')}
            className="inline-flex items-center gap-2 rounded-pill bg-foreground px-6 py-2.5 text-[0.94rem] font-medium text-background shadow-[rgba(0,0,0,0.06)_0px_1px_2px] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Start Building
          </button>
          <button
            onClick={() => scrollToSection('review')}
            className="inline-flex items-center gap-2 rounded-pill border border-black/8 bg-background px-6 py-2.5 text-[0.94rem] font-medium text-foreground transition-opacity hover:opacity-90 dark:border-white/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            See how it works
          </button>
        </div>

        {/* Feature cards */}
        <div
          ref={scrollerRef}
          className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {HERO_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => scrollToSection(card.id)}
              className="group flex flex-col items-start rounded-2xl border border-black/5 bg-background p-6 text-left shadow-[rgba(0,0,0,0.03)_0px_2px_4px] transition-all hover:border-black/8 hover:shadow-[rgba(0,0,0,0.06)_0px_4px_12px] dark:border-white/5 dark:hover:border-white/8"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-black/5 bg-muted text-foreground dark:border-white/5">
                {card.icon}
              </div>
              <span className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-mono text-brand-deep dark:text-brand">
                {card.label}
              </span>
              <h3 className="mb-2 text-[1.05rem] font-semibold leading-[1.3] tracking-subhead text-foreground">
                {card.title}
              </h3>
              <p className="text-sm leading-[1.6] text-muted-foreground">
                {card.copy}
              </p>
            </button>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="mt-12 flex flex-col items-center gap-1.5 text-muted-foreground/40">
          <span className="font-mono text-[9px] font-medium uppercase tracking-label">Scroll to explore</span>
          <ChevronDown className="size-4 animate-bounce" />
        </div>
      </div>
    </section>
  )
}
