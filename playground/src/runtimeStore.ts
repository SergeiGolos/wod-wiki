/**
 * Shared in-memory store for pending runtimes.
 *
 * When a workout is started via route navigation (open: route), the WodBlock
 * is stashed here keyed by a UUID, then the app navigates to
 * /tracker/:runtimeId. TrackerPage reads and deletes the entry.
 */
import type { WodBlock } from '@/components/Editor/types'

export const pendingRuntimes = new Map<string, { block: WodBlock; noteId: string }>()

/**
 * Tracks currently active (running) runtimes, keyed by blockId.
 *
 * When a workout starts in view or dialog mode the block is registered here.
 * When it stops or completes it is removed.  Any component can check this
 * map to decide whether to show a "View" reconnect button instead of "Run".
 */
export const activeRuntimes = new Map<string, WodBlock>()
