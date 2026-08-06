/**
 * tourFixtureSession.ts — a canned 21-15-9 session for the home tour's
 * analytics slides (#dogfood: "Session Log & Review" and "Explore Your Data"
 * rendered as empty states for anyone who hadn't run the timer demo).
 *
 * The fixture is produced by REALLY compiling and running the welcome-1.md
 * workout against a mock clock — same machinery as the storybook review
 * harnesses — so the scorecard and review grid show genuine segments,
 * decoupled from whether the visitor pressed Run. A live run (playground
 * session or the ambient scroll-mode drain) always takes precedence; the
 * fixture is only the never-empty default.
 *
 * Computed lazily on first access and cached: running ~80 simulated steps
 * is cheap, but there is no reason to pay it for visitors who never reach
 * the analytics slides.
 */

import { ScriptRuntime } from '@/runtime/ScriptRuntime'
import { RuntimeStack } from '@/runtime/RuntimeStack'
import { EventBus } from '@/runtime/events'
import { createMockClock } from '@/runtime/RuntimeClock'
import { createParser } from '@/parser/parserInstance'
import type { WhiteboardScript } from '@/parser/WhiteboardScript'
import { createCompiler } from '@/runtime/services/runtimeServices'
import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction'
import { NextAction } from '@/runtime/actions/stack/NextAction'
import { TickEvent } from '@/runtime/events/TickEvent'
import { getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'

/** The welcome-1.md workout, fenced — mirrors the hero demo content. */
const FIXTURE_SOURCE = [
  '```time',
  '21-15-9',
  '  Kettlebell Swings 24kg',
  '  400m Run',
  '  Deadlifts 225lb',
  '  *:30 Rest',
  '```',
].join('\n')

/** Simulated pace per Next step — brisk but believable for 21-15-9. */
const STEP_MS = 45_000
const MAX_STEPS = 80

let cached: Segment[] | null = null

/**
 * Segments of a simulated completion of the welcome-1.md workout.
 * Synchronous and memoized; safe to call during render once the analytics
 * slides have been entered.
 */
export function getTourFixtureSegments(): Segment[] {
  if (cached) return cached

  const script = createParser().read(FIXTURE_SOURCE) as WhiteboardScript
  const clock = createMockClock(new Date('2024-06-15T09:00:00Z'))
  const runtime = new ScriptRuntime(script, createCompiler(), {
    stack: new RuntimeStack(),
    clock,
    eventBus: new EventBus(),
  })

  runtime.do(new StartSessionAction({ label: 'Sample Session' }))

  let steps = 0
  while (runtime.stack.count > 0 && steps < MAX_STEPS) {
    clock.advance(STEP_MS)
    runtime.handle(new TickEvent(undefined, runtime.nowProvider))
    runtime.do(new NextAction(undefined, runtime.nowProvider))
    steps++
  }

  const { segments } = getAnalyticsFromRuntime(runtime)
  cached = segments
  return segments
}
