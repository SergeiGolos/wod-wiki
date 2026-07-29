import { Link } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { effortsPath } from '../lib/routes'

const DISCIPLINES = ['strength', 'gymnastics', 'rowing', 'kettlebell', 'running', 'swimming', 'cycling', 'bodyweight', 'recovery', 'walking']

export function TourRegistrySection() {
  return (
    <section
      data-testid="tour-registry"
      className="border-t border-border bg-muted/20 px-6 py-16"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight">The Movement Registry</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Every movement your metrics speak in.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DISCIPLINES.slice(0, 6).map((d) => (
            <span key={d} className="rounded border border-border bg-card px-2 py-1 font-mono text-xs capitalize">
              {d}
            </span>
          ))}
          <span className="rounded border border-border bg-card px-2 py-1 font-mono text-xs">
            +{DISCIPLINES.length - 6}
          </span>
        </div>

        <Link
          to={effortsPath()}
          onClick={() => telemetry.record(HOME_EVENTS.effortsOpened)}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse the registry
        </Link>
      </div>
    </section>
  )
}
