/**
 * homeSharedScript — the home-hero share contract (#882).
 *
 * Receiver side: a `/load?z=<gzip>&by=<name>` link decodes into this store
 * (see useZipProcessor) before redirecting to `/`; the hero editor renders
 * the shared script instead of welcome-1.md until the visitor clears it with
 * the editor header's Reset button. Re-following the original link stores it
 * again.
 *
 * Sharer side: the name attached to your own links, prompted once on the
 * first share (empty string = asked, declined — don't re-prompt).
 *
 * Preference-scale and disposable, so localStorage — same tier as
 * playgroundProfile, but deliberately separate keys: the received script is
 * resettable content, and writing the sharer name must not trip the
 * profile-initialized flag that gates the First-Note Wizard.
 */

export interface HomeSharedScript {
  content: string
  by?: string
}

const SHARED_KEY = 'wodwiki.homeShared.v1'
const SHARE_NAME_KEY = 'wodwiki.shareName.v1'

function storage(): Storage | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
}

export function saveHomeShared(script: HomeSharedScript): void {
  try {
    storage()?.setItem(SHARED_KEY, JSON.stringify(script))
  } catch {
    // Non-fatal — a shared script is disposable.
  }
}

export function loadHomeShared(): HomeSharedScript | null {
  try {
    const raw = storage()?.getItem(SHARED_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<HomeSharedScript> | null
    if (typeof parsed?.content !== 'string') return null
    return {
      content: parsed.content,
      by: typeof parsed.by === 'string' ? parsed.by : undefined,
    }
  } catch {
    return null
  }
}

export function clearHomeShared(): void {
  try {
    storage()?.removeItem(SHARED_KEY)
  } catch {
    // Non-fatal.
  }
}

/** The name the local user attaches to their own share links. Null = never asked. */
export function getShareName(): string | null {
  try {
    return storage()?.getItem(SHARE_NAME_KEY) ?? null
  } catch {
    return null
  }
}

export function setShareName(name: string): void {
  try {
    storage()?.setItem(SHARE_NAME_KEY, name)
  } catch {
    // Non-fatal.
  }
}
