import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenReviewPanel } from '../components/FrozenReviewPanel'
import { REVIEW_STEPS } from '../data/parallaxActSteps'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'

export interface Act4ReviewSectionProps {
  runtime: IScriptRuntime | null
}

export function Act4ReviewSection({ runtime }: Act4ReviewSectionProps) {
  return (
    <ParallaxSection
      id="review"
      steps={REVIEW_STEPS}
      stickyAlign="left"
      chromeTitle="Review"
      stickyContent={() => <FrozenReviewPanel runtime={runtime} />}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
    />
  )
}
