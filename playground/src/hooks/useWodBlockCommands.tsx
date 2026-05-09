/**
 * useWodBlockCommands — action-matrix hook for WOD block inline command bars.
 *
 * Encodes the full per-context button matrix defined in
 * docs/navbar-wodblock-actions-assessment-2026-05-08.md §1.2.
 *
 * Returns a WodCommand[] containing only the actions permitted by the current
 * PageMode whose handler has been supplied. Pages provide only the handlers
 * they can implement; the hook silently omits buttons with no handler.
 *
 * Matrix:
 *   playground        → play, share, add-to-today, schedule
 *   journal-history   → share, schedule
 *   journal-active    → play, share, schedule
 *   journal-plan      → open-in-playground, share, schedule
 *   collection-readonly (feed + collection) → play, open-in-playground, share, schedule
 */

import { useMemo } from 'react'
import {
  PlayIcon,
  ShareIcon,
  PlusIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
} from '@heroicons/react/20/solid'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import type { WodBlock } from '@/components/Editor/types'
import type { PageMode } from '@/types/content-type'

export interface WodBlockHandlers {
  /** Start the workout immediately (navigate to tracker). */
  onPlay?: (block: WodBlock) => void
  /** Copy a deep-link URL to this block to the clipboard. */
  onShare?: (block: WodBlock) => void
  /** Append this block to today's journal entry (no date picker). */
  onAddToToday?: (block: WodBlock) => void
  /** Open a date picker so the user can schedule the block on any date. */
  onSchedule?: (block: WodBlock) => void
  /** Open the block in a new playground page. */
  onOpenInPlayground?: (block: WodBlock) => void
}

export function useWodBlockCommands(
  mode: PageMode,
  handlers: WodBlockHandlers,
): WodCommand[] {
  return useMemo(() => {
    const cmds: WodCommand[] = []

    // ── play ─────────────────────────────────────────────────────────────
    if (
      handlers.onPlay &&
      (mode === 'playground' ||
        mode === 'journal-active' ||
        mode === 'collection-readonly')
    ) {
      cmds.push({
        id: 'play',
        label: 'Play',
        icon: <PlayIcon className="h-3 w-3 fill-current" />,
        primary: true,
        onClick: handlers.onPlay,
      })
    }

    // ── open-in-playground ────────────────────────────────────────────────
    if (
      handlers.onOpenInPlayground &&
      (mode === 'journal-plan' || mode === 'collection-readonly')
    ) {
      cmds.push({
        id: 'open-in-playground',
        label: 'Playground',
        icon: <PencilSquareIcon className="h-3 w-3" />,
        onClick: handlers.onOpenInPlayground,
      })
    }

    // ── share ─────────────────────────────────────────────────────────────
    if (handlers.onShare) {
      cmds.push({
        id: 'share',
        label: 'Share',
        icon: <ShareIcon className="h-3 w-3" />,
        onClick: handlers.onShare,
      })
    }

    // ── add-to-today ──────────────────────────────────────────────────────
    if (handlers.onAddToToday && mode === 'playground') {
      cmds.push({
        id: 'add-to-today',
        label: 'Today',
        icon: <PlusIcon className="h-3 w-3" />,
        onClick: handlers.onAddToToday,
      })
    }

    // ── schedule (calendar date picker) ───────────────────────────────────
    // Available on every mode except journal-history (past entries are immutable).
    // journal-history only gets share + schedule (user may clone to another date).
    if (handlers.onSchedule) {
      cmds.push({
        id: 'schedule',
        label: 'Schedule',
        icon: <CalendarDaysIcon className="h-3 w-3" />,
        onClick: handlers.onSchedule,
      })
    }

    return cmds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, handlers.onPlay, handlers.onShare, handlers.onAddToToday, handlers.onSchedule, handlers.onOpenInPlayground])
}
