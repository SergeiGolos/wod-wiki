/**
 * Catalog / Organisms / OnboardingBanner / Panel onboarding
 *
 * Source: wayfinder map #673, ticket #675.
 *
 * Fully interactive visual prototypes for Concept 1 (Header Actions).
 * Demonstrates onboarding progress integrated directly into the sticky
 * editor panel (CanvasEditorPanel) header, featuring a hover overlay for
 * step navigation.
 *
 * Features:
 *   1. Hover Popover Navigation — Hovering over the step pill displays a
 *      detailed overlay listing the 5 onboarding steps.
 *   2. Step Links (Jump Ahead/Back) — Each step in the popover acts as an
 *      interactive button. Clicking a step updates the active step in real-time,
 *      re-rendering both the header actions and the editor panel content.
 *   3. Simulated Content States — The panel body changes dynamically based
 *      on the active step to simulate the user experience:
 *        - Step 1: Default Welcome markdown.
 *        - Step 2: Unsaved draft workout with a blinking cursor.
 *        - Step 3: Running workout timer (AMRAP 15 mins countdown).
 *        - Step 4: Save Workout Result logging form.
 *        - Step 5: Final Review Grid with simulated performance charts.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Check, Dumbbell, Play, Timer, Trophy } from 'lucide-react'
import { CanvasEditorPanel } from '../../../../playground/src/components/organisms/canvas/CanvasEditorPanel'

// ── Story Meta ─────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'catalog/organisms/OnboardingBanner/panel-onboarding',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Visual prototypes for onboarding states integrated directly into the sticky ' +
          'editor panel (CanvasEditorPanel). Designed to be compact, fit in a single line, ' +
          'and support mobile viewports.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ── Mock Dependencies ──────────────────────────────────────────────────

const mockDeps = {
  navigate: () => {},
  setQueryParam: () => {},
  setPanelState: () => {},
}

// ── Step metadata with icons ──────────────────────────────────────────

const ONBOARDING_STEPS = [
  { id: 1, label: 'Landed on WOD Wiki', desc: 'Arrived at the playground dashboard', icon: Check },
  { id: 2, label: 'Edit example workout', desc: 'Modify the markdown content below', icon: Dumbbell },
  { id: 3, label: 'Run workout timer', desc: 'Start compiling and run the timer', icon: Play },
  { id: 4, label: 'Log workout results', desc: 'Save your completed workout data', icon: Timer },
  { id: 5, label: 'Review your progress', desc: 'Check your logged performance metrics', icon: Trophy },
]

// ── Layout Override CSS ───────────────────────────────────────────────

const gridOverrideStyles = `
  .force-desktop > div {
    display: flex !important;
    position: relative !important;
    top: auto !important;
    height: 340px !important;
    width: 100% !important;
    padding: 0 !important;
  }
  .force-mobile > div {
    display: block !important;
    position: relative !important;
    top: auto !important;
    height: 260px !important;
    width: 100% !important;
    max-width: 380px !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }
`

// ── Simulated Panel Body Content ──────────────────────────────────────

function SimulatedEditorContent({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="h-full bg-background p-4 font-mono text-[11px] leading-relaxed overflow-auto border-t border-border/20">
        <span className="text-brand"># Welcome to WOD Wiki</span>
        <br />
        <span className="text-muted-foreground">Created just now · Step 1</span>
        <br />
        <br />
        Write your workouts in Markdown here.
        <br />
        Try editing this file to move to the next step.
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="h-full bg-background p-4 font-mono text-[11px] leading-relaxed overflow-auto border-t border-border/20 relative">
        <span className="text-brand"># Welcome to WOD Wiki</span>
        <br />
        <span className="text-muted-foreground">Unsaved Changes · Step 2</span>
        <br />
        <br />
        <span className="text-emerald-600">AMRAP 15 mins</span>
        <br />
        5 Dumbbell Thrusters
        <br />
        10 Pull-ups
        <span className="animate-pulse font-bold text-brand ml-0.5">|</span>
        <br />
        <br />
        <div className="absolute bottom-4 right-4 animate-bounce">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider text-primary-foreground bg-primary shadow-md">
            <Play className="size-3 fill-current" />
            Run Timer
          </button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="h-full bg-background p-4 flex flex-col items-center justify-center border-t border-border/20 select-none">
        <span className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">
          Running Workout Timer
        </span>
        <span className="font-mono text-4xl font-black text-foreground tabular-nums">
          14:52
        </span>
        <span className="text-[10px] text-muted-foreground mt-2">
          5 Thrusters · 10 Pull-ups
        </span>
        <div className="flex gap-2 mt-4">
          <button className="px-3 py-1 rounded bg-muted text-foreground text-[10px] font-bold">
            Pause
          </button>
          <button className="px-3 py-1 rounded bg-brand text-background text-[10px] font-bold">
            Complete
          </button>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="h-full bg-background p-4 flex flex-col justify-between border-t border-border/20">
        <div>
          <span className="text-[10px] font-black text-brand uppercase tracking-widest block mb-3">
            Log Workout Results
          </span>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Result (Rounds + Reps)
            </label>
            <input
              type="text"
              placeholder="e.g. 4 rounds + 5 reps"
              defaultValue="3 rounds + 8 reps"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-muted/30 focus:outline-none"
              readOnly
            />
          </div>
        </div>
        <button className="w-full py-2 rounded bg-brand text-background text-xs font-black uppercase tracking-wider">
          Save Effort
        </button>
      </div>
    )
  }

  return (
    <div className="h-full bg-background p-4 border-t border-border/20 overflow-auto">
      <span className="text-[10px] font-black text-brand uppercase tracking-widest block mb-3">
        Review Performance
      </span>
      <div className="border border-border/60 rounded-lg p-3 bg-muted/10">
        <div className="flex justify-between items-center text-xs font-bold mb-2">
          <span>AMRAP 15 mins</span>
          <span className="text-brand">3 rounds + 8 reps</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-brand rounded-full" style={{ width: '85%' }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>RPE: 8/10</span>
          <span>Today, 10:45 AM</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-4">
        <Check className="size-3" />
        All onboarding steps completed successfully!
      </span>
    </div>
  )
}

// ── Interactive Panel Onboarding Component ─────────────────────────────

interface InteractivePanelOnboardingProps {
  variant: 'desktop' | 'mobile'
  initialStep: number
}

function InteractivePanelOnboarding({ variant, initialStep }: InteractivePanelOnboardingProps) {
  const [stepsComplete, setStepsComplete] = useState(initialStep)
  const totalSteps = 5

  // Navigation click handler
  const handleStepClick = (stepNum: number) => {
    setStepsComplete(stepNum)
  }

  // Header Actions with Hover Popover
  const headerActions = (
    <div className="relative group py-1 shrink-0">
      {/* Target Pill */}
      <button className="flex items-center gap-2 cursor-pointer focus:outline-none">
        {stepsComplete === totalSteps ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" />
            <span className="text-[8px] font-black uppercase tracking-wider">Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-background">
              Step {stepsComplete}/{totalSteps}
            </span>
            {variant === 'desktop' && (
              <span className="text-[9px] text-muted-foreground select-none">
                Hover to navigate
              </span>
            )}
          </div>
        )}
      </button>

      {/* Popover overlay */}
      <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right">
        <div className="mb-2.5 pb-2 border-b border-border/60">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Onboarding Roadmap
          </h5>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Hover to explore. Click steps to jump ahead or back.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = step.id < stepsComplete
            const isActive = step.id === stepsComplete
            const isFuture = step.id > stepsComplete

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className="w-full text-left p-1.5 rounded-lg hover:bg-muted/80 transition-colors flex items-start gap-2.5 focus:outline-none"
              >
                {/* State Bullet Indicator */}
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full mt-0.5">
                  {isCompleted ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-2.5" />
                    </span>
                  ) : isActive ? (
                    <span className="flex size-4 items-center justify-center rounded-full border border-brand bg-brand/10">
                      <span className="size-1.5 rounded-full bg-brand" />
                    </span>
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full border border-muted-foreground/30 text-[8px] font-bold text-muted-foreground/60">
                      {step.id}
                    </span>
                  )}
                </span>

                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold leading-none ${isFuture ? 'text-muted-foreground/70' : 'text-foreground'}`}>
                    {step.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-normal mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const title = stepsComplete === totalSteps ? 'Editor' : 'Get Started'
  const subtitle =
    stepsComplete === 1 ? 'Step 1: Landed' :
    stepsComplete === 2 ? 'Step 2: Draft' :
    stepsComplete === 3 ? 'Step 3: Run' :
    stepsComplete === 4 ? 'Step 4: Log' : 'Complete'

  return (
    <CanvasEditorPanel
      variant={variant}
      panelTitle={title}
      panelSubtitle={subtitle}
      panelContent={<SimulatedEditorContent step={stepsComplete} />}
      headerActions={headerActions}
      deps={mockDeps}
    />
  )
}

// ── Interactive Exploration Grid ─────────────────────────────────────

function InteractiveExplorationGrid() {
  const renderPanel = (startStep: number, variant: 'desktop' | 'mobile') => (
    <InteractivePanelOnboarding variant={variant} initialStep={startStep} />
  )

  return (
    <div className="p-8 bg-muted/10 min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: gridOverrideStyles }} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Row 1: Starting at Landed (Step 1) */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 1: Start (1/5) — Desktop (Hover badge to test)
          </h4>
          <div className="force-desktop">{renderPanel(1, 'desktop')}</div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 1: Start (1/5) — Mobile
          </h4>
          <div className="force-mobile">{renderPanel(1, 'mobile')}</div>
        </div>

        {/* Row 2: Starting at Running Timer (Step 3) */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 2: Mid-Onboarding (3/5) — Desktop
          </h4>
          <div className="force-desktop">{renderPanel(3, 'desktop')}</div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 2: Mid-Onboarding (3/5) — Mobile
          </h4>
          <div className="force-mobile">{renderPanel(3, 'mobile')}</div>
        </div>

        {/* Row 3: Starting at Completion Done (Step 5) */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 3: Onboarding Complete (5/5) — Desktop
          </h4>
          <div className="force-desktop">{renderPanel(5, 'desktop')}</div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            State 3: Onboarding Complete (5/5) — Mobile
          </h4>
          <div className="force-mobile">{renderPanel(5, 'mobile')}</div>
        </div>
      </div>
    </div>
  )
}

// ── Stories ───────────────────────────────────────────────────────────

export const InteractiveConcept1: Story = {
  name: 'Concept 1: Header Actions (Interactive Onboarding)',
  render: () => <InteractiveExplorationGrid />,
  parameters: {
    docs: {
      story:
        'This is the fully interactive sandbox of Concept 1 (Header Actions). ' +
        'Reviewers can hover over the progress pill in the header of any panel (Desktop or Mobile) to view the roadmap popover. ' +
        'Clicking any step link will update the panel state, modifying the header subtitle and changing the editor content dynamically ' +
        'to showcase what the user experiences during each step.',
    },
  },
}
