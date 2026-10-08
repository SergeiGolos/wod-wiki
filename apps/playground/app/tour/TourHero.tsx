export function TourHeroHeading() {
  return (
    <div className="@container flex w-full flex-col items-center text-center">
      <h1 className="text-[clamp(32px,6.5cqi,64px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        <span className="block">Write your workout.</span>
        <span className="block">Run it. Track it.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        Plain-text Markdown becomes a step-through workout clock — and every line logs queryable training data.
      </p>
    </div>
  )
}

