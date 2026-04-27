export interface ParsedFrontmatter {
  meta: Record<string, string>
  body: string
}

/**
 * Parse simple YAML frontmatter (flat key: value only, no nesting).
 * Returns parsed metadata and the body after the closing `---`.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key) continue
    meta[key] = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
  }

  return { meta, body: match[2] }
}

export function stripFrontmatter(raw: string): string {
  return parseFrontmatter(raw).body
}
