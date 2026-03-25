import { useRef } from 'react'
import {
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Timer,
  BarChart2,
  Play,
} from 'lucide-react'
import { scrollToSection } from './ParallaxSection'
import { useNavigate } from 'react-router-dom'

export function HomeHero() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      label: 'Write Like a Coach',
      tagline: 'Plan sessions in plain text',
      copy: 'Exactly the way coaches whiteboard workouts — reps, rounds, distances, rest. No forms, no dropdowns.',
      color: 'text-blue-600 dark:text-blue-400',
      ring: 'hover:border-blue-400/50',
      bg: 'bg-blue-500/10',
    },
    {
      id: 'editor', // Scrolls to the live demo
      icon: <Timer className="size-6" />,
      label: 'Smart Timer Runs the Show',
      tagline: 'Hit play and follow along',
      copy: "The timer knows when each round ends, when to rest, and what's coming next.",
      color: 'text-orange-600 dark:text-orange-400',
      ring: 'hover:border-orange-400/50',
      bg: 'bg-orange-500/10',
    },
    {
      id: 'editor', // Scrolls to the live demo
      icon: <BarChart2 className="size-6" />,
      label: 'Analytics That Make Sense',
      tagline: 'See your work calculated',
      copy: 'Total volume, time under load, intensity. Pre-workout estimates, post-workout totals.',
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
          <div className="flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 animate-in zoom-in duration-500">
            <Zap className="size-12 fill-current" />
          </div>
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl text-foreground uppercase drop-shadow-sm leading-tight">
              Your workout — written once, run forever.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              WOD Wiki is a workout studio for coaches, trainers, and home gym enthusiasts. 
              Write your session in a simple notation, hit play, and let the timer do the rest. 
              Every rep, every round, tracked automatically.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => scrollToSection('editor')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="size-4 fill-current" />
                Try it Now
              </button>
              <button
                onClick={() => navigate('/journal')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 text-sm font-black uppercase tracking-widest text-foreground hover:bg-muted transition-all"
              >
                Open Journal →
              </button>
            </div>

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
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-8 -mx-6 px-6 sm:mx-0 sm:px-0 sm:pb-0 scroll-smooth"
              >
                {HERO_CARDS.map((card) => (
                  <button
                    key={card.label}
                    onClick={() => scrollToSection(card.id)}
                    className={`
                      snap-center shrink-0 w-[85vw] sm:w-auto sm:flex-1 sm:min-w-[300px]
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
