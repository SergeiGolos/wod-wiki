/**
 * PlaygroundRunTipWidget
 *
 * Non-editable callout widget rendered inside the playground note via
 * ```widget:playground-run-tip``` sections.
 *
 * Renders a styled tip box with a downward-right arrow that visually
 * points toward the wod block immediately below it, prompting the user
 * to press the Run button.
 */

import React from 'react'
import type { WidgetProps } from '@/components/Editor/widgets/types'

export const PlaygroundRunTipWidget: React.FC<WidgetProps> = () => {
  return (
    <div className="relative my-3 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      {/* Left accent */}
      <div className="mt-0.5 flex-shrink-0 text-primary">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9 5v4.5M9 11.5v1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Copy */}
      <div className="flex-1 text-sm leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Ready to try it?</span>{' '}
        Press the{' '}
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 align-middle text-[11px] font-bold text-primary-foreground">
          ▶ Run
        </span>{' '}
        button that appears on the workout block below to start the timer and track your rounds.
      </div>

      {/* Arrow pointing down-right toward the wod block */}
      <div
        className="pointer-events-none absolute -bottom-4 right-8 text-primary/50"
        aria-hidden="true"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 3 L17 3 L17 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 11 L17 17 L23 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
