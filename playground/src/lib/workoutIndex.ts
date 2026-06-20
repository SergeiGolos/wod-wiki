/**
 * workoutIndex — the deduped home for the markdown bundle and the
 * front-matter-shaped index.
 *
 * Owns the Vite glob that loads every workout markdown file and the pure
 * shaping pass that turns that glob into a typed `WorkoutItem[]` array.
 * Centralising the glob here is the win: `App.tsx` and
 * `PlaygroundLandingPage.tsx` were each duplicating the same 30-line
 * `useMemo` and the `WorkoutItem` type. Leaf components still receive
 * `workoutItems` as a prop (their injected-data tests rely on it).
 */
import { useMemo } from 'react'

/**
 * Eager glob of every markdown file under the repo-root `markdown/` directory,
 * with keys normalised to the canonical `../../markdown/...` form (see
 * `normalizeWorkoutKey` below). Values are the raw file contents (eager,
 * query `?raw`, default import). Consumers that need a
 * `wodFiles: Record<string, string>` map should pass this object directly —
 * see `MarkdownCanvasPage`.
 */
// Vite glob keys are relative to THIS module, so they change depth whenever the
// file moves — that drift is what broke every canvas page ("Source not found")
// when this glob moved out of App.tsx (2 levels deep) into lib/ (3 levels).
const rawWorkoutFiles = import.meta.glob(
  '../../../markdown/**/*.md',
  { eager: true, query: '?raw', import: 'default' },
)

// Normalise to the canonical `../../markdown/...` contract that resolveSource,
// MarkdownCanvasPage.test.tsx, and HomeView.stories.tsx all already expect, so
// the exported keys stay stable regardless of where this file lives.
function normalizeWorkoutKey(relPath: string): string {
  const idx = relPath.indexOf('markdown/')
  return idx === -1 ? relPath : '../../' + relPath.slice(idx)
}

export const workoutFiles: Record<string, string> = Object.fromEntries(
  Object.entries(rawWorkoutFiles).map(([path, content]) => [
    normalizeWorkoutKey(path),
    content,
  ]),
)

export interface WorkoutItem {
  id: string
  name: string
  category: string
  content: string
  /** When true, this item is excluded from all search results (front matter: `search: hidden`) */
  searchHidden?: boolean
}

/** Path format: `../../markdown/{collections|canvas}/{category}/{file}.md` or `../../markdown/{collections|canvas}/{file}.md` */
function deriveCategory(parts: string[]): string {
  const markdownIdx = parts.indexOf('markdown')
  if (markdownIdx !== -1 && parts.length > markdownIdx + 2) {
    return parts[markdownIdx + 2]!
  }
  return 'General'
}

function deriveSearchHidden(raw: string): boolean {
  const fmMatch = raw.match(/^---[\r\n]([\s\S]*?)[\r\n]---/)
  if (!fmMatch) return false
  const searchLine = fmMatch[1]!.match(/^search:\s*(\S+)/m)
  return !!(searchLine && searchLine[1]!.toLowerCase() === 'hidden')
}

/**
 * Pure front-matter shaping pass. Given the eager glob's entries, returns
 * the typed list leaf components consume.
 */
export function buildWorkoutItems(
  files: Record<string, string | unknown>,
): WorkoutItem[] {
  return Object.entries(files).map(([path, fileContent]) => {
    const parts = path.split('/')
    const fileName = parts[parts.length - 1]!.replace('.md', '')
    const raw = fileContent as string
    return {
      id: path,
      name: fileName,
      category: deriveCategory(parts),
      content: raw,
      searchHidden: deriveSearchHidden(raw),
    }
  })
}

/**
 * Memoised index of all workout markdown files. Used by `App.tsx` and
 * `PlaygroundLandingPage.tsx`; leaf components still receive the result as
 * a prop (see `MarkdownCanvasPage`).
 */
export function useWorkoutItems(): WorkoutItem[] {
  return useMemo(() => buildWorkoutItems(workoutFiles), [])
}
