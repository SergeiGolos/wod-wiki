/**
 * Dashboard note operations — pure markdown↔markdown transforms over the
 * locked dashboard-note format (#899). Every operation:
 *
 *  - takes the note's raw content and returns the NEW raw content (the caller
 *    persists through journalNotes, the only write path);
 *  - is identity-guarded: the target widget is located by its positional key
 *    (`w${index}`, matching buildDashboardDocument) AND its expected body
 *    content. A guard mismatch returns null and writes NOTHING — a concurrent
 *    edit or reorder between read and write can never retarget the splice to
 *    the wrong widget.
 *
 * A widget's editable unit is its "group": the title heading / coaching
 * question paragraph the document builder associates with the block (strict
 * adjacency, same rule as buildDashboardDocument) plus the ```query fence
 * itself. Move/duplicate/remove operate on the whole group so the rendered
 * card — title, question, chart — travels together.
 */

import { parseDashboardNote, type DashboardParsedSection } from './parser';
import { DASHBOARD_GRID_MAX_COLS } from './model';

// ── Widget spec ────────────────────────────────────────────────────────────

export interface WidgetSpec {
  /** Card title — renders as a `## ` heading above the block. */
  title?: string;
  /** Coaching question — the paragraph between the heading and the block. */
  question?: string;
  /** Raw widget type from the fence suffix ('' → the `table` default). */
  type: string;
  spanCols?: number;
  spanFull?: boolean;
  /** The composed WQL — stored verbatim as the block body. */
  wql: string;
  /** Trailing `/`-separated positional params (goal targets, …). */
  params?: string[];
}

export type WidgetSpan = Pick<WidgetSpec, 'spanCols' | 'spanFull'>;

/** Opening fence line for a widget spec (` ```query `, ` ```query:timeseries-2 `, …). */
export function widgetFenceTag(spec: Pick<WidgetSpec, 'type' | 'spanCols' | 'spanFull'>): string {
  const type = spec.type.trim();
  let suffix = type === '' ? '' : `:${type}`;
  if (spec.spanFull) {
    suffix += '-full';
  } else if (spec.spanCols != null && spec.spanCols > 1) {
    suffix += `-${spec.spanCols}`;
  }
  return `\`\`\`query${suffix}`;
}

/** One-line block body: the WQL plus optional `/`-separated params. */
export function widgetBodyLine(spec: Pick<WidgetSpec, 'wql' | 'params'>): string {
  const wql = spec.wql.trim();
  const params = (spec.params ?? []).map((p) => p.trim()).filter((p) => p !== '');
  return params.length === 0 ? wql : `${wql} / ${params.join(' ')}`;
}

/** The markdown lines of a whole widget group (heading? / question? / fence block). */
export function renderWidgetGroup(spec: WidgetSpec): string[] {
  const lines: string[] = [];
  const title = spec.title?.trim();
  const question = spec.question?.trim();
  if (title) lines.push(`## ${title}`);
  if (question) lines.push(question);
  if (lines.length > 0) lines.push('');
  lines.push(widgetFenceTag(spec));
  lines.push(widgetBodyLine(spec));
  lines.push('```');
  return lines;
}

// ── Group location ─────────────────────────────────────────────────────────

interface WidgetGroup {
  /** Index into the query-section (widget) ordering — the `w${i}` key. */
  widgetIndex: number;
  /** Absolute line range in the raw content, covering the whole group. */
  startLine: number;
  endLine: number;
}

/**
 * Locate a widget's group, identity-guarded by its expected block body (the
 * `body` field buildDashboardDocument produced when the caller last parsed).
 * Returns null when the widget vanished or the body no longer matches —
 * the caller must re-read and never write.
 */
function findWidgetGroup(
  sections: readonly DashboardParsedSection[],
  key: string,
  expectedBody: string,
): WidgetGroup | null {
  const querySections = sections.filter((s) => s.type === 'query');
  const widgetIndex = querySections.findIndex((_, i) => `w${i}` === key);
  if (widgetIndex === -1) return null;
  const block = querySections[widgetIndex];

  // Identity guard: the section's effective body line must still be what the
  // caller's last parse saw (same extraction rule as buildDashboardDocument).
  const bodyLine =
    block.content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l !== '' && !l.startsWith('#')) ?? '';
  if (bodyLine !== expectedBody.trim()) return null;

  return { widgetIndex, startLine: groupStartLine(sections, block), endLine: block.endLine };
}

/**
 * Group start for a query block: the associated title heading / coaching
 * question paragraph directly above it (strict adjacency — the document
 * builder's association rule), or the block's own line when untitled.
 */
function groupStartLine(sections: readonly DashboardParsedSection[], block: DashboardParsedSection): number {
  const idx = sections.indexOf(block);
  const above = sections[idx - 1];
  if (above?.type === 'markdown' && above.subtype === 'paragraph') {
    const heading = sections[idx - 2];
    return heading?.type === 'markdown' && heading.subtype === 'heading'
      ? heading.startLine
      : above.startLine;
  }
  if (above?.type === 'markdown' && above.subtype === 'heading') return above.startLine;
  return block.startLine;
}

/** Line ranges of every widget group, in widget order. */
function widgetGroupRanges(sections: readonly DashboardParsedSection[]): WidgetGroup[] {
  return sections
    .filter((s) => s.type === 'query')
    .map((block, widgetIndex) => ({
      widgetIndex,
      startLine: groupStartLine(sections, block),
      endLine: block.endLine,
    }));
}

// ── Operations ─────────────────────────────────────────────────────────────

/**
 * Append a new widget group at the end of the note body. Frontmatter and all
 * existing content are preserved verbatim.
 */
export function appendWidget(raw: string, spec: WidgetSpec): string {
  const lines = raw.split('\n');
  const group = renderWidgetGroup(spec);
  // Separate the new group from the body with exactly one blank line.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return [...lines, '', ...group, ''].join('\n');
}

/**
 * Replace a widget's whole group (title/question/type/span/WQL) in place.
 * Identity-guarded; null = the note changed under the caller — re-read.
 */
export function updateWidget(
  raw: string,
  key: string,
  expectedBody: string,
  spec: WidgetSpec,
): string | null {
  const { sections } = parseDashboardNote(raw);
  const group = findWidgetGroup(sections, key, expectedBody);
  if (!group) return null;
  const lines = raw.split('\n');
  lines.splice(group.startLine, group.endLine - group.startLine + 1, ...renderWidgetGroup(spec));
  return lines.join('\n');
}

/** Duplicate a widget's group directly below itself. Identity-guarded. */
export function duplicateWidget(
  raw: string,
  key: string,
  expectedBody: string,
): string | null {
  const { sections } = parseDashboardNote(raw);
  const group = findWidgetGroup(sections, key, expectedBody);
  if (!group) return null;
  const lines = raw.split('\n');
  const copy = lines.slice(group.startLine, group.endLine + 1);
  // Insert the copy after the original, blank-line separated.
  lines.splice(group.endLine + 1, 0, '', ...copy);
  return lines.join('\n');
}

/**
 * Remove a widget's group (title/question/fence). Identity-guarded. Collapses
 * the blank-line gap the removal leaves behind.
 */
export function removeWidget(
  raw: string,
  key: string,
  expectedBody: string,
): string | null {
  const { sections } = parseDashboardNote(raw);
  const group = findWidgetGroup(sections, key, expectedBody);
  if (!group) return null;
  const lines = raw.split('\n');
  lines.splice(group.startLine, group.endLine - group.startLine + 1);
  // Collapse a blank sandwich (line before + line after both empty).
  if (
    group.startLine > 0 &&
    group.startLine < lines.length &&
    lines[group.startLine - 1] === '' &&
    lines[group.startLine] === ''
  ) {
    lines.splice(group.startLine, 1);
  }
  return lines.join('\n');
}

/**
 * Reorder a widget among the query blocks — the whole group (title, question,
 * block) moves past its neighbor. `delta` is -1 (up) or +1 (down); out-of-range
 * moves are no-ops that return the content unchanged. Identity-guarded.
 */
export function moveWidget(
  raw: string,
  key: string,
  expectedBody: string,
  delta: -1 | 1,
): string | null {
  const { sections } = parseDashboardNote(raw);
  const group = findWidgetGroup(sections, key, expectedBody);
  if (!group) return null;
  const groups = widgetGroupRanges(sections);
  const neighbor = groups[group.widgetIndex + delta];
  if (!neighbor) return raw; // already first/last — nothing to do

  const lines = raw.split('\n');
  const moving = lines.slice(group.startLine, group.endLine + 1);

  if (delta === -1) {
    lines.splice(group.startLine, group.endLine - group.startLine + 1);
    lines.splice(neighbor.startLine, 0, ...moving);
  } else {
    // Remove the moving group first (shifts the neighbor's start when the
    // neighbor comes after), then insert past the neighbor's new end.
    lines.splice(group.startLine, group.endLine - group.startLine + 1);
    const shift = group.startLine < neighbor.startLine ? group.endLine - group.startLine + 1 : 0;
    const insertAt = neighbor.endLine - shift + 1;
    lines.splice(insertAt, 0, ...moving);
  }
  return lines.join('\n');
}

/**
 * Resize (or re-span) a widget: rewrites only the opening fence line, leaving
 * the body, params, and surrounding markdown untouched. `spanFull` wins over
 * `spanCols`. Identity-guarded.
 */
export function resizeWidget(
  raw: string,
  key: string,
  expectedBody: string,
  span: WidgetSpan,
): string | null {
  if (span.spanCols != null && (span.spanCols < 1 || span.spanCols > DASHBOARD_GRID_MAX_COLS)) {
    return null;
  }
  const { sections } = parseDashboardNote(raw);
  const group = findWidgetGroup(sections, key, expectedBody);
  if (!group) return null;
  const block = sections.find(
    (s) => s.type === 'query' && s.startLine >= group.startLine && s.endLine <= group.endLine,
  )!;
  const lines = raw.split('\n');
  const indent = lines[block.startLine].match(/^\s*/)![0];
  lines[block.startLine] =
    indent +
    widgetFenceTag({ type: block.widgetType ?? '', spanCols: span.spanCols, spanFull: span.spanFull });
  return lines.join('\n');
}
