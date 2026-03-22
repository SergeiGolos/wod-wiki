import type { ReactNode } from 'react'
import { BookOpen, TerminalSquare, Zap, ArrowRight } from 'lucide-react'

interface DeepDiveCard {
  title: string
  tagline: string
  href: string
  icon: ReactNode
  color: string
  bg: string
  ring: string
  bullets: string[]
  links: { label: string; href: string }[]
}

export function DeepDiveSection() {
  const cards: DeepDiveCard[] = [
    {
      title: 'Syntax Reference',
      tagline: 'Everything the parser understands',
      href: '#/syntax',
      icon: <BookOpen className="size-6" />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      ring: 'hover:border-blue-400/40',
      bullets: [
        'All metric types and modifiers',
        'Timer formats — :SS, MM:SS, HH:MM:SS',
        'Round and rep-scheme syntax',
        'Rest, interval, and protocol markers',
      ],
      links: [
        { label: 'Timers', href: '#/syntax#timers' },
        { label: 'Metrics', href: '#/syntax#metrics' },
        { label: 'Groups', href: '#/syntax#groups' },
        { label: 'Protocols', href: '#/syntax#protocols' },
      ],
    },
    {
      title: 'Getting Started',
      tagline: '6-level progressive tutorial',
      href: '#/getting-started',
      icon: <Zap className="size-6" />,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-500/10',
      ring: 'hover:border-orange-400/40',
      bullets: [
        'Level 1 — your first timer',
        'Level 2 — reps and movements',
        'Level 4 — groups and rounds',
        'Level 6 — advanced protocols',
      ],
      links: [
        { label: 'Level 1', href: '#/getting-started#level-1' },
        { label: 'Level 2', href: '#/getting-started#level-2' },
        { label: 'Level 4', href: '#/getting-started#level-4' },
        { label: 'Level 6', href: '#/getting-started#level-6' },
      ],
    },
    {
      title: 'Playground',
      tagline: 'Build, run, and explore live',
      href: '#/playground',
      icon: <TerminalSquare className="size-6" />,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
      ring: 'hover:border-purple-400/40',
      bullets: [
        'Live editor + timer side by side',
        'Load workouts from the library',
        'Annotated syntax-builder mode',
        'Full WodScript language support',
      ],
      links: [
        { label: 'Editor', href: '#/playground' },
        { label: 'Timer', href: '#/playground#timer' },
        { label: 'Syntax', href: '#/syntax' },
        { label: 'Library', href: '#/playground#library' },
      ],
    },
  ]

  return (
    <section id="resources" className="bg-background py-16 px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">
            Up Next
          </h2>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Deep-dive documentation, tutorials, and tools.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className={`group flex flex-col rounded-xl border border-border p-6 transition-all ${
                card.ring
              } hover:shadow-lg hover:shadow-primary/5`}
            >
              {/* Icon + title */}
              <div className={`flex size-12 items-center justify-center rounded-xl ${card.bg} ${card.color} mb-4 transition-colors`}>
                {card.icon}
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${card.color} mb-1`}>
                {card.title}
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-foreground mb-3">
                {card.tagline}
              </h3>

              {/* Feature bullets */}
              <ul className="space-y-1.5 mb-5 flex-1">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-[12px] text-muted-foreground leading-snug">
                    <span className={`mt-0.5 text-[8px] shrink-0 ${card.color}`}>▸</span>
                    {b}
                  </li>
                ))}
              </ul>

              {/* Shortcut links */}
              <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-border/50">
                {card.links.map((lnk) => (
                  <span
                    key={lnk.label}
                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-border/40 ${card.color} hover:bg-border transition-colors`}
                  >
                    {lnk.label}
                    <ArrowRight className="size-2.5" />
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
