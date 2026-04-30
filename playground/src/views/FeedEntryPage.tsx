// playground/src/views/FeedEntryPage.tsx
// Read-only detail page for a single feed entry — /feeds/:stem
//
// Renders like a collection entry: MarkdownCanvasPage with full Run Now /
// Schedule / action buttons. No editor. Nav panel shows feed context.

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { parseFeedFiles } from '../services/parseFeedFiles'
import { parseCanvasMarkdown } from '../canvas/parseCanvasMarkdown'
import { MarkdownCanvasPage } from '../canvas/MarkdownCanvasPage'

interface FeedEntryPageProps {
  wodFiles: Record<string, string>
  theme: string
  workoutItems: Array<{ id: string; name: string; category: string; content: string }>
  onSelect: (item: any) => void
}

export function FeedEntryPage({ wodFiles, theme, workoutItems, onSelect }: FeedEntryPageProps) {
  // Route is /feeds/:id — grab either param name for resilience
  const { id, stem: stemParam } = useParams<{ id?: string; stem?: string }>()
  const stem = id ?? stemParam
  const allFeeds = useMemo(() => parseFeedFiles(), [])
  console.log('[FeedEntryPage] params:', { id, stemParam, stem, allFeedsCount: allFeeds.length, firstStem: allFeeds[0]?.stem })

  const entry = useMemo(
    () => allFeeds.find(f => f.stem === (stem ? decodeURIComponent(stem) : '')),
    [allFeeds, stem]
  )

  const canvasPage = useMemo(() => {
    if (!entry) return null
    return parseCanvasMarkdown(entry.content, `/feeds/${entry.stem}`)
  }, [entry])

  if (!entry || !canvasPage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Feed entry not found.
      </div>
    )
  }

  return (
    <MarkdownCanvasPage
      page={canvasPage}
      wodFiles={wodFiles}
      theme={theme}
      workoutItems={workoutItems}
      onSelect={onSelect}
    />
  )
}
