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

export interface ExampleBlock {
  label: string
  source: string
}

/** A piece of a section's body: either a markdown prose segment or an inline
 *  button that should render immediately after the preceding prose segment.
 *  The renderer concatenates chunks in order; buttons never appear in
 *  `section.prose`, which is a prose-only string for legacy consumers. */
export type SectionTheme = 'slate' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose'
export type SectionDensity = 'default' | 'compact'

export const SECTION_THEME_STYLES: Record<SectionTheme, { panel: string; accent: string; progress: string }> = {
  slate: {
    panel: 'border-slate-500/35 shadow-slate-500/12',
    accent: 'from-slate-500/70 via-slate-400/25 to-transparent',
    progress: 'from-slate-500 to-slate-400',
  },
  amber: {
    panel: 'border-amber-500/35 shadow-amber-500/12',
    accent: 'from-amber-500/75 via-amber-400/25 to-transparent',
    progress: 'from-amber-500 to-orange-400',
  },
  emerald: {
    panel: 'border-emerald-500/35 shadow-emerald-500/12',
    accent: 'from-emerald-500/75 via-emerald-400/25 to-transparent',
    progress: 'from-emerald-500 to-teal-400',
  },
  sky: {
    panel: 'border-sky-500/35 shadow-sky-500/12',
    accent: 'from-sky-500/75 via-sky-400/25 to-transparent',
    progress: 'from-sky-500 to-cyan-400',
  },
  violet: {
    panel: 'border-violet-500/35 shadow-violet-500/12',
    accent: 'from-violet-500/75 via-fuchsia-400/25 to-transparent',
    progress: 'from-violet-500 to-fuchsia-400',
  },
  rose: {
    panel: 'border-rose-500/35 shadow-rose-500/12',
    accent: 'from-rose-500/75 via-pink-400/25 to-transparent',
    progress: 'from-rose-500 to-pink-400',
  },
}

export type ProseChunk =
  | { kind: 'prose'; text: string }
  | { kind: 'button'; button: ButtonBlock }
  | { kind: 'widget'; widget: 'hero-carousel' | 'workouts-list' }

export interface CanvasSection {
  id: string
  heading: string
  level: number
  attrs: string[]         // e.g. ['sticky', 'dark', 'full-bleed', 'density:compact']
  theme?: SectionTheme
  density?: SectionDensity
  isDark?: boolean
  isFullBleed?: boolean
  isSticky?: boolean
  /** Prose-only body. Derived from proseChunks; present on parser-built sections. */
  prose?: string
  /** Ordered, fence-aware body: prose segments interleaved with buttons so
   *  each button renders after the paragraph it was defined under. */
  proseChunks: ProseChunk[]
  view?: ViewBlock
  commands: CommandBlock[]
  buttons: ButtonBlock[]
  examples?: ExampleBlock[]
}


/**
 * Derive the flat prose string from a section's ordered chunks.
 * Concatenates all `prose` chunks in order — the inverse of the
 * parser's prose→chunks pass. Returns '' for sections with no prose chunks.
 */
export function getSectionProse(section: CanvasSection): string {
  return section.proseChunks
    .filter((c): c is { kind: 'prose'; text: string } => c.kind === 'prose')
    .map(c => c.text)
    .join('')
}
export interface ParsedCanvasPage {
  frontmatter: Record<string, any>
  template: string
  route: string
  sections: CanvasSection[]
  /**
   * Page-level quests, extracted from ```quest fenced blocks that appear
   * before the first section heading. Each entry is consumed by
   * `useSyntaxChallenge` to validate the page's compiled editor block.
   */
  quests: Quest[]
  /**
   * Page-level chapters, extracted from ```chapter fenced blocks.
   * Chapters are a visual grouping layer that the OnboardingBanner
   * reads to show progressive-completion badges. Their `questIds` may
   * reference quests on OTHER pages (cross-route completion is read
   * directly from the localStorage ledger).
   */
  chapters: Chapter[]
}

/** Page-level quest — same shape as the validator's `Quest.validation` so
 *  `useSyntaxChallenge` can pass it through unchanged. */
export interface Quest {
  id: string
  label: string
  desc?: string
  validation?: { type: string; [key: string]: unknown }
}

/** A chapter groups one or more home-page sections and references the
 *  quest ids whose completion unlocks the chapter badge. */
export interface Chapter {
  id: string
  title: string
  /** Lucide icon name — resolved by the renderer. */
  badge: string
  /** Quest ids (any page) whose completion contributes to this chapter. */
  questIds: string[]
  /** Section ids (on this page) that belong to this chapter, for visual grouping. */
  sectionIds: string[]
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

function parseExampleBlock(content: string): ExampleBlock {
  const lines = content.split('\n')
  const kv = parseKeyValue(lines)
  return {
    label: kv['label'] ?? 'Example',
    source: kv['source'] ?? '',
  }
}


/**
 * Extract view / command / button fenced blocks from section text,
 * returning the remaining prose and parsed block objects.
 *
 * Regex: matches opening ```<type>\n ... closing ``` on its own line.
 * Only canvas DSL blocks (view/command/button) are excised from the prose;
 * all other fenced blocks (code, etc.) are kept so markdown renderers can
 * display them as styled code blocks.
 *
 * Returns `proseChunks` — an ordered list of prose segments and inline
 * buttons — so the renderer can place each button after the paragraph it
 * was authored under. `prose` is the legacy concatenation of the prose
 * segments only.
 */

/** Parse the inner content of a single ```quest fenced block. Returns
 *  `null` when the block is missing the required `id` field. */
function parseQuestBlock(content: string): Quest | null {
  const meta: Record<string, string> = {};
  const validation: Record<string, string> = {};
  let inValidation = false;
  for (const raw of content.split('\n')) {
    // Strip leading whitespace so indented sub-fields (e.g. inside
    // `validation:`) match the field regex.
    const line = raw.trim();
    if (line === '') continue;
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (key === 'validation') {
      inValidation = true;
      continue;
    }
    if (inValidation) validation[key] = value;
    else meta[key] = value;
  }
  if (!meta.id) return null;
  const q: Quest = { id: meta.id, label: meta.label ?? meta.id };
  if (meta.desc) q.desc = meta.desc;
  if (Object.keys(validation).length > 0) {
    // Coerce numeric fields (e.g. `count: 3` → `3` instead of `"3"`) so
    // validator schemas like `min-rounds` work without extra parsing.
    const v: Record<string, unknown> = { ...validation };
    for (const k of Object.keys(v)) {
      const num = Number(v[k]);
      if (v[k] !== '' && !isNaN(num) && String(num) === v[k]) v[k] = num;
    }
    q.validation = v as Quest['validation'];
  }
  return q;
}

/** Strip page-level ```quest fenced blocks from the body. The block
 *  text is always removed from the body so it doesn't bleed into section
 *  parsing or prose rendering, but the parsed quest is collected
 *  regardless of where the block sits (pre-heading or in-section) so
 *  authors can place quests in the section that introduces them. */
function extractPageQuests(body: string): { quests: Quest[]; body: string } {
  const lines = body.split('\n');
  const quests: Quest[] = [];
  const out: string[] = [];
  let inFence = false;
  let buffer: string[] = [];
  const flushFence = () => {
    const q = parseQuestBlock(buffer.join('\n'));
    if (q) quests.push(q);
    buffer = [];
  };
  for (const line of lines) {
    if (inFence) {
      if (/^```\s*$/.test(line)) {
        flushFence();
        inFence = false;
      } else {
        buffer.push(line);
      }
      continue;
    }
    const fenceMatch = line.match(/^```(\w+)\s*$/);
    if (fenceMatch) {
      if (fenceMatch[1] === 'quest') {
        inFence = true;
      } else {
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  if (inFence) flushFence();
  return { quests, body: out.join('\n') };
}

/** Parse the inner content of a single ```chapter fenced block. Returns
 *  `null` when the block is missing the required `id` or `title` field. */
function parseChapterBlock(content: string): Chapter | null {
  const meta: Record<string, string> = {};
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!m) continue;
    meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  if (!meta.id || !meta.title) return null;
  const c: Chapter = {
    id: meta.id,
    title: meta.title,
    badge: meta.badge || 'trophy',
    questIds: parseIdList(meta.quests),
    sectionIds: parseIdList(meta.sections),
  };
  return c;
}

/** Parse a comma- or whitespace-separated list of ids from a flat field
 *  value, tolerating `[bracket]` syntax. Empty / null returns []. */
function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  const stripped = raw.replace(/^\[|\]$/g, '').trim();
  if (!stripped) return [];
  return stripped
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strip page-level ```chapter fenced blocks from the body. Page-wide
 *  scope (same as ```quest). The block text is removed so it doesn't
 *  bleed into section parsing. */
function extractPageChapters(body: string): { chapters: Chapter[]; body: string } {
  const lines = body.split('\n');
  const chapters: Chapter[] = [];
  const out: string[] = [];
  let inFence = false;
  let buffer: string[] = [];
  const flushFence = () => {
    const c = parseChapterBlock(buffer.join('\n'));
    if (c) chapters.push(c);
    buffer = [];
  };
  for (const line of lines) {
    if (inFence) {
      if (/^```\s*$/.test(line)) {
        flushFence();
        inFence = false;
      } else {
        buffer.push(line);
      }
      continue;
    }
    const fenceMatch = line.match(/^```(\w+)\s*$/);
    if (fenceMatch) {
      if (fenceMatch[1] === 'chapter') {
        inFence = true;
      } else {
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  if (inFence) flushFence();
  return { chapters, body: out.join('\n') };
}

function splitProseForWidgets(text: string): ProseChunk[] {
  if (!text) return []
  const tokens = [
    { token: '{{hero-carousel}}', widget: 'hero-carousel' as const },
    { token: '{{workouts}}', widget: 'workouts-list' as const },
  ]

  let chunks: ProseChunk[] = [{ kind: 'prose', text }]

  for (const { token, widget } of tokens) {
    const nextChunks: ProseChunk[] = []
    for (const chunk of chunks) {
      if (chunk.kind !== 'prose') {
        nextChunks.push(chunk)
        continue
      }
      const parts = chunk.text.split(token)
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          nextChunks.push({ kind: 'widget', widget })
        }
        nextChunks.push({ kind: 'prose', text: parts[i] })
      }
    }
    chunks = nextChunks
  }

  return chunks.filter((c) => c.kind !== 'prose' || c.text !== '')
}
function extractBlocks(text: string): {
  proseChunks: ProseChunk[]
  view?: ViewBlock
  commands: CommandBlock[]
  buttons: ButtonBlock[]
  examples: ExampleBlock[]
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

  // Parse each fence into its block object, in source order, and remember
  // the parsed `ButtonBlock` for the inline chunk list. We keep a parallel
  // cursor so the chunk list can interleave prose segments with the
  // specific `button` fences that authored them.
  let view: ViewBlock | undefined
  const commands: CommandBlock[] = []
  const buttons: ButtonBlock[] = []
  const examples: ExampleBlock[] = []
  // `buttonByFenceIdx[i]` holds the ButtonBlock parsed from `fences[i]`,
  // or `null` for non-button fences. Fences are visited in source order.
  const buttonByFenceIdx: Array<ButtonBlock | null> = []

  for (let i = 0; i < fences.length; i++) {
    const { type, content } = fences[i]
    if (type === 'view') {
      view = parseViewBlock(content)
      buttonByFenceIdx.push(null)
    } else if (type === 'command') {
      commands.push(parseCommandBlock(content))
      buttonByFenceIdx.push(null)
    } else if (type === 'button') {
      const btn = parseButtonBlock(content)
      buttons.push(btn)
      buttonByFenceIdx.push(btn)
    } else if (type === 'example') {
      examples.push(parseExampleBlock(content))
      buttonByFenceIdx.push(null)
    } else {
      buttonByFenceIdx.push(null)
    }
  }

  // Walk the source text once more, slicing the prose and interleaving
  // button chunks at the position each `button` fence was authored. The
  // `view`/`command`/`example` fences are anchor/trigger blocks only — they
  // drive the sticky panel but have no prose representation of their own —
  // so they're excised from the prose entirely, same as `button`. Any other
  // fence type (e.g. a `wod` code sample) is left untouched so it renders as
  // a normal fenced code block.
  const invisibleFenceTypes = new Set(['view', 'command', 'example'])
  const proseChunks: ProseChunk[] = []
  let pos = 0
  for (let i = 0; i < fences.length; i++) {
    const fence = fences[i]
    const button = buttonByFenceIdx[i]
    if (button) {
      proseChunks.push(...splitProseForWidgets(text.slice(pos, fence.start)))
      proseChunks.push({ kind: 'button', button })
      pos = fence.end
    } else if (invisibleFenceTypes.has(fence.type)) {
      proseChunks.push(...splitProseForWidgets(text.slice(pos, fence.start)))
      pos = fence.end
    }
  }
  proseChunks.push(...splitProseForWidgets(text.slice(pos)))

  return { proseChunks, view, commands, buttons, examples }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseCanvasMarkdown(raw: string, defaultRoute: string = '/'): ParsedCanvasPage | null {
  const { meta, body } = parseFrontmatter(raw)
  if (String(meta['template'] ?? '') !== 'canvas') return null

  // Pull page-level quest and chapter blocks out of the body before
  // section splitting. Both are page-wide (collect+strip every block).
  const { quests, body: bodyWithoutQuests } = extractPageQuests(body)
  const { chapters } = extractPageChapters(bodyWithoutQuests)

  const route = String(meta['route'] ?? defaultRoute)
  const sections: CanvasSection[] = []

  type Acc = { heading: string; level: number; attrs: string[]; lines: string[] }
  let cur: Acc | null = null

  const flush = (acc: Acc) => {
    const { proseChunks, view, commands, buttons, examples } = extractBlocks(acc.lines.join('\n'))

    // Support explicit ID in attributes (e.g. {#statement})
    const explicitId = acc.attrs.find(a => a.startsWith('#'))?.slice(1)
    const cleanAttrs = acc.attrs.filter(a => !a.startsWith('#'))
    const hasAttr = (a: string) => cleanAttrs.includes(a)
    const getAttrValue = (key: string) =>
      cleanAttrs.find(attr => attr.startsWith(`${key}:`))?.slice(key.length + 1)

    sections.push({
      id:          explicitId || slugify(acc.heading) || `section-${sections.length}`,
      heading:     acc.heading,
      level:       acc.level,
      attrs:       cleanAttrs,
      theme:       (getAttrValue('theme') ?? 'slate') as any,
      density:     (getAttrValue('density') ?? 'default') as any,
      isDark:      hasAttr('dark'),
      isFullBleed: hasAttr('full-bleed'),
      isSticky:    hasAttr('sticky'),
      prose:       getSectionProse({ proseChunks } as any),
      proseChunks,
      view,
      commands,
      buttons,
      examples,
    })
  }

  for (const line of bodyWithoutQuests.split('\n')) {
    const h = parseHeadingLine(line)
    if (h) {
      if (cur) flush(cur)
      cur = { heading: h.text, level: h.level, attrs: h.attrs, lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  if (cur) flush(cur)

  return { template: 'canvas', route, sections, frontmatter: meta, quests, chapters }
}
