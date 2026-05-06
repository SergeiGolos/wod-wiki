/**
 * PlaygroundWelcomeWidget
 *
 * Non-editable widget rendered inside the playground note via
 * ```widget:playground-welcome``` sections. Explains the three core
 * building-blocks of the wod.wiki syntax: Movement, Structure, and Timing.
 */

import React from 'react'
import type { WidgetProps } from '@/components/Editor/overlays/WidgetCompanion'

export const PlaygroundWelcomeWidget: React.FC<WidgetProps> = () => {
  return (
    <div className="my-4 rounded-lg border border-border bg-muted/20 p-5 text-sm leading-relaxed">
      <p className="mb-3 font-semibold text-foreground">How the syntax works</p>

      <ul className="space-y-3 text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 w-24 shrink-0 font-semibold text-foreground">Movement</span>
          <span>
            Write a number followed by a name — <code className="rounded bg-muted px-1 font-mono text-xs">10 Squats</code>.
            Add a load with a unit: <code className="rounded bg-muted px-1 font-mono text-xs">10 Squats 60kg</code>.
          </span>
        </li>

        <li className="flex items-start gap-2">
          <span className="mt-0.5 w-24 shrink-0 font-semibold text-foreground">Rounds</span>
          <span>
            Wrap movements in a round group with <code className="rounded bg-muted px-1 font-mono text-xs">(3)</code> for three rounds,
            or <code className="rounded bg-muted px-1 font-mono text-xs">(5)</code> for five.
          </span>
        </li>

        <li className="flex items-start gap-2">
          <span className="mt-0.5 w-24 shrink-0 font-semibold text-foreground">Timers</span>
          <span>
            Use <code className="rounded bg-muted px-1 font-mono text-xs">2:00</code> for a countdown,{' '}
            <code className="rounded bg-muted px-1 font-mono text-xs">*:30</code> for a rest interval, or{' '}
            <code className="rounded bg-muted px-1 font-mono text-xs">AMRAP 20:00</code> for an AMRAP block.
          </span>
        </li>

        <li className="flex items-start gap-2">
          <span className="mt-0.5 w-24 shrink-0 font-semibold text-foreground">Reps</span>
          <span>
            Use comma-separated rep schemes:{' '}
            <code className="rounded bg-muted px-1 font-mono text-xs">21,15,9 Thrusters</code> runs three sets automatically.
          </span>
        </li>
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Edit the workout above, then press{' '}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">▶ Run</kbd>{' '}
        to start the timer.
      </p>
    </div>
  )
}
