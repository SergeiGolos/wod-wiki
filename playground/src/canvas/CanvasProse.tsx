/**
 * CanvasProse — rich markdown renderer for canvas section prose.
 *
 * Supports:
 *  - GitHub Flavored Markdown (tables, strikethrough, task lists, etc.)
 *  - YAML frontmatter blocks → rendered as a styled metadata card
 *  - Embedded images with lazy loading
 *  - Links (external ones open in new tab)
 *  - Code blocks with syntax-styled presentation
 *  - File links (.pdf, .mov, etc.) with a download/open icon
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

// ── File-type helpers ─────────────────────────────────────────────────────────

const FILE_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'wav', 'flac',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
])

function isFileLink(href: string): boolean {
  const ext = href.split('.').pop()?.split('?')[0]?.toLowerCase() ?? ''
  return FILE_EXTENSIONS.has(ext)
}

function isExternalLink(href: string): boolean {
  return /^https?:\/\//.test(href) || href.startsWith('//')
}

// ── YAML frontmatter renderer ─────────────────────────────────────────────────

/** Matches a leading --- ... --- block at the start of prose. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/

function parseYamlFields(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.+)$/)
    if (m) result[m[1]] = m[2].trim()
  }
  return result
}

function splitFrontmatter(prose: string): { fields: Record<string, string> | null; body: string } {
  const m = prose.match(FRONTMATTER_RE)
  if (!m) return { fields: null, body: prose }
  return { fields: parseYamlFields(m[1]), body: prose.slice(m[0].length).trim() }
}

// ── Custom component map ──────────────────────────────────────────────────────

const components: Components = {
  // Tables — GFM styled
  table({ children }) {
    return (
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-muted/50 text-left">{children}</thead>
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-border/50">{children}</tbody>
  },
  tr({ children }) {
    return <tr className="hover:bg-muted/20 transition-colors">{children}</tr>
  },
  th({ children }) {
    return (
      <th className="px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-muted-foreground border-b border-border">
        {children}
      </th>
    )
  },
  td({ children }) {
    return <td className="px-4 py-2.5 text-sm text-foreground">{children}</td>
  },

  // Images — lazy loaded, rounded
  img({ src, alt, node }) {
    const props = (node as unknown as { properties?: Record<string, unknown> })?.properties ?? {}
    const width = props['width'] as string | undefined
    const height = props['height'] as string | undefined
    return (
      <figure className="my-6">
        <img
          src={src ?? ''}
          alt={alt ?? ''}
          loading="lazy"
          width={width}
          height={height}
          className="rounded-xl border border-border max-w-full h-auto"
        />
        {alt && (
          <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
            {alt}
          </figcaption>
        )}
      </figure>
    )
  },

  // Links — external opens in new tab; file links get a download hint
  a({ href, children }) {
    const h = href ?? ''
    const external = isExternalLink(h)
    const file = isFileLink(h)
    return (
      <a
        href={h}
        rel={external ? 'noopener noreferrer' : undefined}
        target={external || file ? '_blank' : undefined}
        className={cn(
          'underline underline-offset-2 transition-colors',
          file
            ? 'text-primary font-medium'
            : 'text-primary hover:text-primary/70',
        )}
      >
        {children}
        {external && (
          <span className="ml-0.5 text-[10px] align-super opacity-60">↗</span>
        )}
        {file && !external && (
          <span className="ml-0.5 text-[10px] align-super opacity-60">⬇</span>
        )}
      </a>
    )
  },

  // Code blocks — mono styled with language label
  code({ children, className }) {
    const language = className?.replace('language-', '') ?? ''
    const isInline = !className
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[0.85em] text-foreground">
          {children}
        </code>
      )
    }
    return (
      <div className="my-5 rounded-xl overflow-hidden border border-border">
        {language && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
              {language}
            </span>
          </div>
        )}
        <pre className="overflow-x-auto p-4 bg-muted/30">
          <code className="font-mono text-sm text-foreground">{children}</code>
        </pre>
      </div>
    )
  },

  // Headings — styled to match the canvas design language
  h1({ children }) {
    return (
      <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mt-10 mb-4 first:mt-0">
        {children}
      </h1>
    )
  },
  h2({ children }) {
    return (
      <h2 className="text-xl lg:text-2xl font-black tracking-tight text-foreground uppercase leading-tight mt-8 mb-3 first:mt-0">
        {children}
      </h2>
    )
  },
  h3({ children }) {
    return (
      <h3 className="text-base lg:text-lg font-black tracking-wide text-foreground uppercase mt-6 mb-2 first:mt-0">
        {children}
      </h3>
    )
  },
  h4({ children }) {
    return (
      <h4 className="text-sm font-black tracking-widest text-primary uppercase mt-5 mb-2 first:mt-0">
        {children}
      </h4>
    )
  },

  // Paragraphs
  p({ children }) {
    return (
      <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed my-4 first:mt-0">
        {children}
      </p>
    )
  },

  // Lists
  ul({ children }) {
    return (
      <ul className="my-4 space-y-1.5 list-disc list-inside text-sm text-muted-foreground font-medium leading-relaxed">
        {children}
      </ul>
    )
  },
  ol({ children }) {
    return (
      <ol className="my-4 space-y-1.5 list-decimal list-inside text-sm text-muted-foreground font-medium leading-relaxed">
        {children}
      </ol>
    )
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },

  // Blockquote
  blockquote({ children }) {
    return (
      <blockquote className="my-5 pl-4 border-l-2 border-primary/40 text-muted-foreground italic text-sm">
        {children}
      </blockquote>
    )
  },

  // Horizontal rule
  hr() {
    return <hr className="my-8 border-border/50" />
  },

  // Strong / em
  strong({ children }) {
    return <strong className="font-black text-foreground">{children}</strong>
  },
  em({ children }) {
    return <em className="italic text-foreground/80">{children}</em>
  },
}

// ── Plugins ───────────────────────────────────────────────────────────────────

const remarkPlugins = [remarkGfm]

// ── FrontmatterCard — styled metadata block ───────────────────────────────────

function FrontmatterCard({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields)
  if (entries.length === 0) return null
  return (
    <div className="my-6 rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground">
          Metadata
        </span>
      </div>
      <dl className="divide-y divide-border/50">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-4 px-4 py-2">
            <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[100px] shrink-0">
              {key}
            </dt>
            <dd className="text-sm text-foreground break-words">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface CanvasProseProps {
  prose: string
  className?: string
}

export function CanvasProse({ prose, className }: CanvasProseProps) {
  if (!prose) return null
  const { fields, body } = splitFrontmatter(prose)
  return (
    <div className={cn('prose-canvas', className)}>
      {fields && <FrontmatterCard fields={fields} />}
      {body && (
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          components={components}
        >
          {body}
        </ReactMarkdown>
      )}
    </div>
  )
}
