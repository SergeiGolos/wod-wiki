import { BookOpen, TerminalSquare, Zap } from 'lucide-react'

export function DeepDiveSection() {
  const cards = [
    {
      title: 'Syntax Reference',
      body: 'Complete WodScript language reference',
      href: '#/syntax',
      icon: <BookOpen className="size-6" />,
    },
    {
      title: 'Getting Started',
      body: '6-level progressive tutorial',
      href: '#/getting-started',
      icon: <Zap className="size-6" />,
    },
    {
      title: 'Playground',
      body: 'Open editor',
      href: '#/playground',
      icon: <TerminalSquare className="size-6" />,
    },
  ]

  return (
    <section id="resources" className="bg-background py-16 px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">
            Resources
          </h2>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Deep-dive documentation and tools.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="group rounded-xl border border-border p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-4">
                {card.icon}
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.body}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
