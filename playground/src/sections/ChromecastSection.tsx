import { Tv } from 'lucide-react'

export function ChromecastSection() {
  return (
    <section id="chromecast" className="bg-background border-b border-border/30 py-16 px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: content */}
          <div>
            <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
              Chromecast
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
              Cast to your TV
            </h2>
            <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
              Use Chromecast to send your workout to a TV screen. The remote becomes a lap timer. Built for the home gym.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs font-black uppercase tracking-wider">
              <Tv className="size-4" />
              Coming Soon
            </div>
          </div>
          {/* Right: illustration placeholder */}
          <div className="rounded-2xl bg-muted aspect-video flex items-center justify-center">
            <Tv className="size-16 text-muted-foreground/30" />
          </div>
        </div>
      </div>
    </section>
  )
}
