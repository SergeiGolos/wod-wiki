import { Zap, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DeepDiveSection() {
  const navigate = useNavigate()

  const quickLinks = [
    { label: 'Statement Anatomy', href: '/syntax' },
    { label: 'Timers & Direction', href: '/syntax#timers' },
    { label: 'Groups & Repeaters', href: '/syntax#groups' },
  ]

  return (
    <section id="deep-dive" className="bg-background py-24 px-6 lg:px-10 border-t border-border/50">
      <div className="mx-auto max-w-4xl text-center">
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Zap className="size-8" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground">
              Ready to write your own?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              The syntax takes about 10 minutes to learn. The deep-dive guide walks you from 
              your first statement to complex interval protocols — with live examples 
              you can edit and run right here.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8">
          <button
            onClick={() => navigate('/getting-started')}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-foreground px-10 text-sm font-black uppercase tracking-widest text-background shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Start Zero to Hero
            <ArrowRight className="size-4" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="group flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
