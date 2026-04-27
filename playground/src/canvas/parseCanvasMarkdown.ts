import { parseFrontmatter } from '@/utils/frontmatter'

/**
 * Canvas Markdown Parser
 *
 * Parses markdown files with `template: canvas` frontmatter and the
 * canvas DSL (view / command / button fenced blocks, heading attributes)
 * into a structured `ParsedCanvasPage` that `CanvasPage.tsx` renders.
 */

/** Where the runtime opens when set-state: track fires. */
export type OpenMode = 'view' | 'dialog' | 'route'

export interface ViewButton {
  label: string
  open?: OpenMode
  pipeline: PipelineStep[]
}

export interface ViewBlock {
  name: string
  state: string
  source: string
  runtime?: string
  launch?: string
  align: 'left' | 'right'
  width: string
  /** Buttons rendered directly on the sticky panel. */
  buttons: ViewButton[]
}

export interface PipelineStep {
  action: string
  value: string
}

export interface CommandBlock {
  target: string
  /** Where set-state:track opens the runtime. Default: 'dialog'. */
  open?: OpenMode
  pipeline: PipelineStep[]
}

export interface ButtonBlock {
  label: string
  target: string
  /** Where the runtime opens. Default: 'dialog'. */
  open?: OpenMode
  pipeline: PipelineStep[]
}

export interface CanvasSection {
  id: string
  heading: string
  level: number
  attrs: string[]         // e.g. ['sticky', 'dark', 'full-bleed']
  prose: string
  view?: ViewBlock
  commands: CommandBlock[]
  buttons: ButtonBlock[]
}

export interface ParsedCanvasPage {
  template: string
  route: string
  sections: CanvasSection[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseHeadingLine(line: string): { level: number; text: string; attrs: string[] } | null {
  const m = line.match(/^(#{1,6}) (.+)$/)
  if (!m) return null
  const level = m[1].length
  const raw = m[2]
  const attrMatch = raw.match(/\{([^}]+)\}$/)
  const attrs = attrMatch ? attrMatch[1].trim().split(/\s+/).filter(Boolean) : []
  const text = attrMatch ? raw.slice(0, attrMatch.index).trim() : raw.trim()
  return { level, text, attrs }
}

function parseKeyValue(lines: string[]): Record<string, string> {
  const kv: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.+)$/)
    if (m) kv[m[1]] = m[2].trim()
  }
  return kv
}

function parsePipelineSteps(lines: string[]): PipelineStep[] {
  const steps: PipelineStep[] = []
  for (const line of lines) {
    // Matches:  - set-source: markdown/canvas/syntax/rest.md
    const m = line.match(/^\s*-\s+([\w-]+):\s+(.+)$/)
    if (m) steps.push({ action: m[1], value: m[2].trim() })
  }
  return steps
}

function parseViewBlock(content: string): ViewBlock {
  const lines = content.split('\n')
  const kv = parseKeyValue(lines)

  // Parse inline button lines: `button: Label | set-state: track | open: dialog`
  const buttons: ViewButton[] = []
  for (const line of lines) {
    const m = line.match(/^button:\s*(.+)$/)
    if (!m) continue
    const parts = m[1].split('|').map(p => p.trim())
    const label = parts[0] ?? 'Run'
    let open: OpenMode | undefined
    const pipelineParts: string[] = []
    for (const part of parts.slice(1)) {
      const openM = part.match(/^open:\s*(view|dialog|route)$/)
      if (openM) { open = openM[1] as OpenMode; continue }
      pipelineParts.push(`- ${part}`)
    }
    buttons.push({ label, open, pipeline: parsePipelineSteps(pipelineParts) })
  }

  return {
    name:    kv['name']    ?? 'view',
    state:   kv['state']   ?? 'note',
    source:  kv['source']  ?? '',
    runtime: kv['runtime'],
    launch:  kv['launch'],
    align:   (kv['align'] as 'left' | 'right') ?? 'right',
    width:   kv['width']   ?? '48%',
    buttons,
  }
}

function parseCommandBlock(content: string): CommandBlock {
  const lines = content.split('\n')
  let target = ''
  let open: OpenMode | undefined
  for (const line of lines) {
    const m = line.match(/^target:\s*(.+)$/)
    if (m) { target = m[1].trim(); continue }
    const openM = line.match(/^open:\s*(view|dialog|route)$/)
    if (openM) { open = openM[1] as OpenMode; continue }
  }
  return { target, open, pipeline: parsePipelineSteps(lines) }
}

function parseButtonBlock(content: string): ButtonBlock {
  const lines = content.split('\n')
  let label = 'Button'
  let target = ''
  let open: OpenMode | undefined
  for (const line of lines) {
    const labelM = line.match(/^label:\s*(.+)$/)
    if (labelM) { label = labelM[1].trim(); continue }
    const targetM = line.match(/^target:\s*(.+)$/)
    if (targetM) { target = targetM[1].trim(); continue }
    const openM = line.match(/^open:\s*(view|dialog|route)$/)
    if (openM) { open = openM[1] as OpenMode; continue }
  }
  return { label, target, open, pipeline: parsePipelineSteps(lines) }
}

/** Canvas-DSL block types — these are stripped from prose; all other fenced
 *  blocks (javascript, bash, etc.) are preserved so markdown renderers can
 *  display them as styled code blocks. */
const CANVAS_BLOCK_TYPES = new Set(['view', 'command', 'button'])

/**
 * Extract view / command / button fenced blocks from section text,
 * returning the remaining prose and parsed block objects.
 *
 * Regex: matches opening ```<type>\n ... closing ``` on its own line.
 * Only canvas DSL blocks (view/command/button) are excised from the prose;
 * all other fenced blocks (code, etc.) are kept so they render in markdown.
 */
function extractBlocks(text: string): {
  prose: string
  view?: ViewBlock
  commands: CommandBlock[]
  buttons: ButtonBlock[]
} {
  // NOTE: the backtick sequences in these strings intentionally delimit fenced
  // blocks in the DSL — they are NOT nested markdown fences.
  const fenceRe = /^```(\w+)\n([\s\S]*?)^```[ \t]*$/gm
  const fences: Array<{ start: number; end: number; type: string; content: string }> = []

  let match: RegExpExecArray | null
  while ((match = fenceRe.exec(text)) !== null) {
    fences.push({
      start:   match.index,
      end:     match.index + match[0].length,
      type:    match[1],
      content: match[2],
    })
  }

  // Build prose by excising ONLY canvas-specific fence ranges.
  // Non-canvas fenced blocks (code, etc.) are left in place so markdown
  // renderers can display them as styled code/language blocks.
  let prose = ''
  let pos = 0
  for (const { start, end, type } of fences) {
    if (CANVAS_BLOCK_TYPES.has(type)) {
      prose += text.slice(pos, start)
      pos = end
    }
  }
  prose += text.slice(pos)
  prose = prose.trim()

  let view: ViewBlock | undefined
  const commands: CommandBlock[] = []
  const buttons: ButtonBlock[] = []

  for (const { type, content } of fences) {
    if (type === 'view')         view = parseViewBlock(content)
    else if (type === 'command') commands.push(parseCommandBlock(content))
    else if (type === 'button')  buttons.push(parseButtonBlock(content))
  }

  return { prose, view, commands, buttons }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseCanvasMarkdown(raw: string, defaultRoute: string = '/'): ParsedCanvasPage | null {
  const { meta, body } = parseFrontmatter(raw)
  if (meta['template'] !== 'canvas') return null

  const route = meta['route'] ?? defaultRoute
  const sections: CanvasSection[] = []

  type Acc = { heading: string; level: number; attrs: string[]; lines: string[] }
  let cur: Acc | null = null

  const flush = (acc: Acc) => {
    const { prose, view, commands, buttons } = extractBlocks(acc.lines.join('\n'))
    sections.push({
      id:       slugify(acc.heading) || `section-${sections.length}`,
      heading:  acc.heading,
      level:    acc.level,
      attrs:    acc.attrs,
      prose,
      view,
      commands,
      buttons,
    })
  }

  for (const line of body.split('\n')) {
    const h = parseHeadingLine(line)
    if (h) {
      if (cur) flush(cur)
      cur = { heading: h.text, level: h.level, attrs: h.attrs, lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  if (cur) flush(cur)

  return { template: 'canvas', route, sections }
}
