import { BookOpen, FolderOpen, Play, Timer } from 'lucide-react'

import { ButtonLink } from '@/components/ui/ButtonLink'

const DOC_LINKS = {
  movement: {
    to: '/getting-started?h=statement',
    label: 'Movement',
  },
  reps: {
    to: '/syntax/structure?h=rep-schemes',
    label: 'Reps',
  },
  timers: {
    to: '/syntax/protocols',
    label: 'Timers',
  },
  rounds: {
    to: '/syntax/structure?h=simple-rounds',
    label: 'Rounds',
  },
  load: {
    to: '/syntax/basics?h=measurements',
    label: 'Load',
  },
} as const

function DocChip({ to, label }: { to: string; label: string }) {
  return (
    <ButtonLink
      to={to}
      variant="link"
      size="sm"
      className="inline-flex h-auto items-center gap-1 px-0 py-0 text-xs font-semibold text-foreground no-underline hover:text-primary"
    >
      <BookOpen className="size-3" />
      <span>{label}</span>
    </ButtonLink>
  )
}

function ReferenceRow({
  to,
  label,
  description,
}: {
  to: string
  label: string
  description: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
      <div className="w-24 shrink-0 pt-0.5">
        <DocChip to={to} label={label} />
      </div>
      <div className="flex-1">{description}</div>
    </li>
  )
}

export function PlaygroundGuidePanel() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-emerald-500/8 via-background to-background px-6 py-8 lg:px-10">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(16,185,129,0.14), transparent 60%)',
        }}
      />

      <div className="relative flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary/80">
              Playground Flow
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground lg:text-3xl">
              Write the workout, then turn the unknown parts into measured output.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This page now starts with the same seed workout as the home experience. Edit the note directly,
              run a block when you are ready, and use the collections and syntax docs when the template needs a stronger starting point.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            <ButtonLink
              to="/collections"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2"
            >
              <FolderOpen className="size-3.5" />
              Browse Collections
            </ButtonLink>
            <ButtonLink
              to="/getting-started"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2"
            >
              <BookOpen className="size-3.5" />
              Learn Syntax
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <div className="rounded-2xl border border-border/60 bg-background/75 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Timer className="size-4 text-primary" />
              What the starter workout already teaches
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              <ReferenceRow
                to={DOC_LINKS.rounds.to}
                label={DOC_LINKS.rounds.label}
                description={<>Parens like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">(3)</code> mean repeated rounds.</>}
              />
              <ReferenceRow
                to={DOC_LINKS.movement.to}
                label={DOC_LINKS.movement.label}
                description={<>Lines such as <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">Kettlebell Swings</code> become structured movement data.</>}
              />
              <ReferenceRow
                to={DOC_LINKS.reps.to}
                label={DOC_LINKS.reps.label}
                description={<>Numbers like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">10</code> define rep counts.</>}
              />
              <ReferenceRow
                to={DOC_LINKS.load.to}
                label={DOC_LINKS.load.label}
                description={<>Units like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">24kg</code> are preserved for analysis.</>}
              />
              <ReferenceRow
                to={DOC_LINKS.timers.to}
                label={DOC_LINKS.timers.label}
                description={<>Timed steps like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">*:30 Rest</code> are explicit, while work duration becomes knowable after the run.</>}
              />
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Play className="size-4 text-primary" />
              What maps cleanly here
            </div>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
              <li>Edit the starter note directly in the editor below.</li>
              <li>Run any parsed workout block from the note to collect measured data.</li>
              <li>Use collections when you want a stronger template instead of rewriting from scratch.</li>
              <li>Use the syntax docs when the note needs a new pattern that the starter workout does not show.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}