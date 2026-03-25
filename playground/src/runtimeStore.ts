/**
 * Shared in-memory store for pending runtimes.
 *
 * When a workout is started via route navigation (open: route), the WodBlock
 * is stashed here keyed by a UUID, then the app navigates to
 * #/tracker/:runtimeId. TrackerPage reads and deletes the entry.
 */
import type { WodBlock } from '@/components/Editor/types'

export const pendingRuntimes = new Map<string, { block: WodBlock; noteId: string }>()
