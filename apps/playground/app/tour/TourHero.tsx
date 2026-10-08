export function TourHeroHeading() {
  return (
    <div className="@container flex w-full flex-col items-center text-center">
      <h1 className="text-[clamp(32px,6.5cqi,64px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        <span className="block">Write your workout.</span>
        <span className="block">Run it. Track it.</span>
      </h1>
      <p className="mt-4 xl:mt-6 max-w-xl xl:max-w-2xl 2xl:max-w-3xl text-[15px] sm:text-base xl:text-lg leading-relaxed text-muted-foreground">
        Plain-text Markdown becomes a step-through workout clock — and every line logs queryable training data.
      </p>
    </div>
  )
}

