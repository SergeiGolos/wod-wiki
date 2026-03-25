import { Eye, Maximize2, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SplitRunButtonProps {
  /**
   * "Run" executes the workout inline in the view panel (view mode).
   * For sections without a view panel, preferred default is dialog mode.
   */
  onRun: () => void
  /**
   * "Fullscreen" launches the workout via the route-based tracker page.
   */
  onFullscreen: () => void
  /**
   * When true, a runtime is already active but the panel is hidden.
   * Shows an eye-icon reconnect button instead of the split pair.
   */
  isReconnect?: boolean
  /**
   * Called when the user clicks the eye-icon reconnect button.
   * Only relevant when isReconnect=true.
   */
  onReconnect?: () => void
  /** Override the "Run" label text. */
  label?: string
  className?: string
  /** Align the button group (for centered full-bleed sections). */
  center?: boolean
}

/**
 * Split run button molecule.
 *
 *   Normal:     [ ▶ Run | ⤢ ]
 *   Reconnect:  [ 👁 View ]
 *
 * Normal mode provides two actions in one pill:
 *   - Left: inline "Run" in the sticky view panel (view mode)
 *   - Right: fullscreen icon → route-based tracker page
 *
 * Reconnect mode shows when a runtime is active but the panel is hidden,
 * letting the user re-open it without losing the running workout.
 */
export function SplitRunButton({
  onRun,
  onFullscreen,
  isReconnect = false,
  onReconnect,
  label = 'Run',
  className,
  center = false,
}: SplitRunButtonProps) {
  if (isReconnect) {
    return (
      <button
        onClick={onReconnect ?? onRun}
        className={cn(
          'flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase tracking-widest',
          'rounded-full border transition-all active:scale-95',
          'border-amber-500/40 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20',
          'dark:text-amber-400',
          center && 'mx-auto',
          className,
        )}
      >
        <Eye className="size-3.5" />
        View
      </button>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-full',
        'shadow-lg shadow-primary/25',
        center && 'mx-auto',
        className,
      )}
    >
      {/* Left: Run inline */}
      <button
        onClick={onRun}
        className={cn(
          'flex items-center gap-2 pl-5 pr-4 py-2',
          'text-[11px] font-black uppercase tracking-widest',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors active:scale-95',
        )}
      >
        <Play className="size-3 fill-current" />
        {label}
      </button>

      {/* Divider */}
      <div className="w-px bg-primary-foreground/20 self-stretch my-1" />

      {/* Right: Fullscreen / route */}
      <button
        onClick={onFullscreen}
        title="Run fullscreen"
        className={cn(
          'flex items-center px-3 py-2',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors active:scale-95',
        )}
      >
        <Maximize2 className="size-3.5" />
      </button>
    </div>
  )
}
