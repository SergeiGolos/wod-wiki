/**
 * ExampleWidgetTemplate
 *
 * Copy this file when creating a new widget. It demonstrates the Phase 1C
 * authoring pattern:
 * - accept the shared WidgetProps contract
 * - validate the widget-specific config inside the component module
 * - render an explicit author-facing error state when config is malformed
 * - keep the widget stateless and token-driven
 */

import React from 'react'
import type { WidgetConfig, WidgetProps } from './types'

interface ExampleWidgetTemplateConfig {
  title: string
  body?: string
  tone?: 'default' | 'success' | 'warning'
  tags?: string[]
}

type ExampleWidgetTemplateParseResult =
  | { ok: true; value: ExampleWidgetTemplateConfig }
  | { ok: false; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTone(value: unknown): value is ExampleWidgetTemplateConfig['tone'] {
  return value === 'default' || value === 'success' || value === 'warning'
}

/**
 * Validate widget-local config. Shared infrastructure only guarantees that the
 * top-level value is a JSON object.
 */
function parseExampleWidgetTemplateConfig(
  config: WidgetConfig,
): ExampleWidgetTemplateParseResult {
  if (!isRecord(config)) {
    return { ok: false, message: 'Expected a JSON object.' }
  }

  const title = config['title']
  const body = config['body']
  const tone = config['tone']
  const tags = config['tags']

  if (typeof title !== 'string' || title.trim().length === 0) {
    return { ok: false, message: '"title" is required and must be a non-empty string.' }
  }

  if (body !== undefined && typeof body !== 'string') {
    return { ok: false, message: '"body" must be a string when provided.' }
  }

  if (tone !== undefined && !isTone(tone)) {
    return {
      ok: false,
      message: '"tone" must be one of: "default", "success", or "warning".',
    }
  }

  if (
    tags !== undefined
    && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))
  ) {
    return { ok: false, message: '"tags" must be an array of strings.' }
  }

  return {
    ok: true,
    value: {
      title,
      body,
      tone,
      tags: Array.isArray(tags) ? tags : undefined,
    },
  }
}

function toneClasses(tone: ExampleWidgetTemplateConfig['tone']): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/30 bg-emerald-500/10'
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10'
    default:
      return 'border-border bg-card'
  }
}

/**
 * Template widget for future contributors.
 *
 * Example markdown usage:
 * ```widget:example-widget
 * {
 *   "title": "Progressive overload reminder",
 *   "body": "Increase load only when every rep is crisp.",
 *   "tone": "success",
 *   "tags": ["coaching", "playground"]
 * }
 * ```
 */
export const ExampleWidgetTemplate: React.FC<WidgetProps> = ({
  config,
  rawContent,
  sectionId,
}) => {
  const parsed = parseExampleWidgetTemplateConfig(config)

  if (!parsed.ok) {
    return (
      <div className="my-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold text-destructive">Widget config error</p>
        <p className="mt-1 text-muted-foreground">{parsed.message}</p>
        <p className="mt-3 font-mono text-xs text-muted-foreground/80">sectionId: {sectionId}</p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/70 p-3 text-xs text-muted-foreground">
          <code>{rawContent || '{}'}</code>
        </pre>
      </div>
    )
  }

  const { title, body, tone = 'default', tags = [] } = parsed.value

  return (
    <section className={`my-4 rounded-xl border p-5 shadow-sm ${toneClasses(tone)}`}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <li
                key={tag}
                className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      {body && <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>}
    </section>
  )
}
