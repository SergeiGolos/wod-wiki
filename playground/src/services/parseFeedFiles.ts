// playground/src/services/parseFeedFiles.ts

export interface FeedItem {
  /** Full stem e.g. '2026-04-28-0600-running' */
  stem: string
  /** Parsed date, e.g. 2026-04-28 */
  date: Date
  /** Feed name (channel), e.g. 'running' */
  feedName: string
  /** Display title derived from feed name (Title Case) */
  title: string
  /** Raw markdown content */
  content: string
}

const feedModules = import.meta.glob('../../../markdown/feeds/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function toTitleCase(str: string): string {
  return str
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseStem(stem: string): { date: Date; feedName: string } {
  const parts = stem.split('-')
  // parts: [YYYY, MM, DD, HHMM, ...feedname parts]
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const date = new Date(year, month, day)
  const feedName = parts.slice(4).join('-')
  return { date, feedName }
}

export function parseFeedFiles(): FeedItem[] {
  const items: FeedItem[] = Object.entries(feedModules).map(([filePath, content]) => {
    const fileName = filePath.split('/').pop() ?? ''
    const stem = fileName.replace(/\.md$/, '')
    const { date, feedName } = parseStem(stem)
    const h1Match = content.match(/^#\s+(.+)$/m)
    const title = h1Match ? h1Match[1].trim() : toTitleCase(feedName)
    return { stem, date, feedName, title, content }
  })

  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Returns deduplicated list of feed names, sorted alphabetically */
export function getFeedNames(): string[] {
  const names = parseFeedFiles().map((item) => item.feedName)
  return [...new Set(names)].sort()
}
