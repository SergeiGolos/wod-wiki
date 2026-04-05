import { useRef } from 'react'
import {
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Timer,
  BarChart2,
} from 'lucide-react'
import { scrollToSection } from './ParallaxSection'

export function HomeHero() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollScroller = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const scrollAmount = scrollerRef.current.clientWidth * 0.8
      scrollerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const HERO_CARDS = [
    {
      id: 'editor',
      icon: <PenLine className="size-6" />,
      label: 'Plan with Precision',
      tagline: 'Markdown',
      copy: "Forget clunky dropdown menus and restrictive forms. **WOD Wiki** uses **Markdown**, giving you the speed of a digital notebook with the structure of a database. You can draft, format, and share workouts as fast as you can type.",
      color: 'text-blue-600 dark:text-blue-400',
      ring: 'hover:border-blue-400/50',
      bg: 'bg-blue-500/10',
    },
    {
      id: 'editor',
      icon: <Timer className="size-6" />,
      label: 'Execute with Intensity',
      tagline: 'The Timer',
      copy: 'A plan is only as good as its execution. Your scripted workout comes to life with **WOD Wiki**\'s integrated timer.  There\'s no friction—just hit "Start" and let the app keep the pace while you focus on the workout.',
      color: 'text-orange-600 dark:text-orange-400',
      ring: 'hover:border-orange-400/50',
      bg: 'bg-orange-500/10',
    },
    {
      id: 'editor',
      icon: <BarChart2 className="size-6" />,
      label: 'Evolve with Insight',
      tagline: 'Analytics & Data',
      copy: '**WOD Wiki** doesn\'t stop when the timer ends, every lap tracked generates insights. Analyze your performance, identify trends, and make data-driven adjustments and visualize your progress over time.',
      color: 'text-purple-600 dark:text-purple-400',
      ring: 'hover:border-purple-400/50',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <section className="relative px-6 pt-24 pb-16 lg:pt-36 lg:pb-24 overflow-hidden border-b border-border/50">
      <div
        className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl text-foreground uppercase drop-shadow-sm leading-tight">
              WOD Wiki is a workout studio for fitness enthusiasts.
            </h1>

            {/* Value Pillars / Card Scroller */}
            <div className="relative mt-12 max-w-5xl mx-auto w-full group/scroller">
              <button
                onClick={() => scrollScroller('left')}
                className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-all opacity-0 group-hover/scroller:opacity-100 hidden lg:flex text-muted-foreground hover:text-foreground"
                aria-label="Scroll left"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={() => scrollScroller('right')}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-all opacity-0 group-hover/scroller:opacity-100 hidden lg:flex text-muted-foreground hover:text-foreground"
                aria-label="Scroll right"
              >
                <ChevronRight className="size-6" />
              </button>
              <div
                ref={scrollerRef}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
              >
                {HERO_CARDS.map((card) => (
                  <button
                    key={card.label}
                    onClick={() => scrollToSection(card.id)}
                    className={`
                      group flex flex-col items-start rounded-xl border border-border p-6 text-left transition-all ${
                      card.ring
                    } hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5
                    `}
                  >
                    <div className={`flex size-12 items-center justify-center rounded-xl ${card.bg} ${card.color} mb-4 transition-colors`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${card.color} mb-1`}>
                        {card.label}
                      </div>
                      <div className="text-base font-black uppercase tracking-tight text-foreground mb-3 leading-tight">
                        {card.tagline}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {card.copy}
                    </p>
                    <div className="w-full pt-4 border-t border-border/50 mt-auto">
                      <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${card.color}`}>
                        See it in action
                        <ChevronDown className="size-3 rotate-[-90deg]" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 mt-4 text-muted-foreground/40">
            <span className="text-[9px] font-black uppercase tracking-[0.35em]">Scroll to explore</span>
            <ChevronDown className="size-4 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  )
}
