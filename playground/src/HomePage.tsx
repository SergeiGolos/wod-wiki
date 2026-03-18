import { useState, useEffect, useCallback } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'

// ── Slides ───────────────────────────────────────────────────────────

const SLIDES = [
  {
    eyebrow: 'Welcome',
    title: 'WOD.WIKI',
    body: 'Your personal workout notebook. Script, time, and log every training session — right in the browser.',
    highlight: 'Runs 100% locally. No account needed.',
  },
  {
    eyebrow: 'Built-in Timer',
    title: 'Execute any workout.',
    body: 'Countdown, AMRAP, EMOM, and custom intervals. Hit Run on any script block and the inline timer takes over.',
    highlight: 'Countup · Countdown · AMRAP · EMOM',
  },
  {
    eyebrow: 'Your Notebook',
    title: 'Write it once, reuse forever.',
    body: 'A growing library of kettlebell, CrossFit, and swimming workouts. Browse, fork, and make each one yours.',
    highlight: 'Kettlebell · CrossFit · Swimming',
  },
]

const INTERVAL_MS = 6000

// ── Hero ─────────────────────────────────────────────────────────────

function HeroSlides() {
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  const goTo = useCallback((next: number) => {
    setFading(true)
    setTimeout(() => {
      setIndex(next)
      setFading(false)
    }, 220)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      goTo((index + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [index, goTo])

  const slide = SLIDES[index]

  return (
    <div className="relative w-full select-none overflow-hidden bg-background">
      {/* Background gradient accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 60% 50%, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex max-w-none flex-col gap-4 px-6 py-8 lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:py-10">
        {/* Left: static brand */}
        <div className="shrink-0 lg:w-64">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 rotate-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground">WOD.WIKI</span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground leading-snug">Workout scripting & execution for athletes.</p>
        </div>

        {/* Divider */}
        <div className="hidden h-12 w-1.5 rounded-full bg-border lg:block" />

        {/* Right: cycling slide copy */}
        <div
          className="min-w-0 flex-1 transition-opacity duration-200"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
            {slide.eyebrow}
          </span>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground lg:text-3xl leading-none">{slide.title}</h2>
          <p className="mt-2 max-w-xl text-base font-medium leading-relaxed text-muted-foreground">{slide.body}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-success opacity-80">{slide.highlight}</p>
        </div>

        {/* Dots */}
        <div className="flex shrink-0 items-center gap-2 self-end lg:flex-col lg:self-center">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? 'h-3 w-3 bg-primary shadow-sm shadow-primary/50 scale-110'
                  : 'h-2 w-2 bg-border hover:bg-muted-foreground/30'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── HomePageContent ───────────────────────────────────────────────────

export interface HomePageContentProps {
  actualTheme: string
  workoutItems: Array<{ id: string; name: string; category: string; content: string }>
  onSelectWorkout: (item: any) => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (open: boolean) => void
  activeCategory: string | null
  setActiveCategory: (cat: string | null) => void
}

export function HomePageContent({
  actualTheme,
  workoutItems,
  onSelectWorkout,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  activeCategory,
  setActiveCategory,
}: HomePageContentProps) {
  return (
    <div className="flex h-full flex-col min-h-[calc(100vh-theme(spacing.20))]">
      {/* Hero */}
      <HeroSlides />

      {/* Editor */}
      <div className="flex flex-1 flex-col min-h-0">
        <UnifiedEditor
          key="home"
          value={PLAYGROUND_CONTENT}
          onChange={() => {}}
          className="flex-1 min-h-0 w-full"
          theme={actualTheme}
        />
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={onSelectWorkout}
        initialCategory={activeCategory}
      />
    </div>
  )
}
