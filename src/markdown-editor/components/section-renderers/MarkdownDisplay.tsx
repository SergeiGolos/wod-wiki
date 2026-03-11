/**
 * MarkdownDisplay
 * 
 * Read-only renderer for markdown sections.
 * Renders each line with basic markdown-aware styling:
 * headings, bold, italic, lists, and plain text.
 */

import React from 'react';
import type { Section } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { cn } from '@/lib/utils';

export interface MarkdownDisplayProps {
  section: Section;
  className?: string;
  startLineNumber?: number;
  gutterWidth?: number;
}

/** Apply heading styles based on # prefix */
function headingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+/);
  return match ? match[1].length : null;
}

/** Detect if a line is part of a markdown table */
function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

/** Detect if a line is a table separator (e.g. |---|---|) */
function isTableSeparator(line: string): boolean {
  return /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|$/.test(line.trim());
}

/** Parse table cells from a table line */
function parseTableCells(line: string): string[] {
  return line.trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

/** Parse alignment from separator row */
function parseTableAlignment(line: string): ('left' | 'center' | 'right')[] {
  return parseTableCells(line).map(cell => {
    const trimmed = cell.replace(/\s/g, '');
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    return 'left';
  });
}

const HEADING_STYLES: Record<number, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-semibold',
  4: 'text-base font-medium',
  5: 'text-sm font-medium',
  6: 'text-xs font-medium uppercase tracking-wider',
};

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ 
  section, 
  className,
  startLineNumber,
  gutterWidth = 0
}) => {
  const lines = section.displayContent.split('\n');

  // Group lines into runs: 'table' runs and 'normal' runs
  interface LineRun {
    type: 'normal' | 'table';
    startIndex: number;
    lines: string[];
  }
  const runs: LineRun[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableLine(lines[i])) {
      const start = i;
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      runs.push({ type: 'table', startIndex: start, lines: tableLines });
    } else {
      const start = i;
      const normalLines: string[] = [];
      while (i < lines.length && !isTableLine(lines[i])) {
        normalLines.push(lines[i]);
        i++;
      }
      runs.push({ type: 'normal', startIndex: start, lines: normalLines });
    }
  }

  const renderGutterCell = (lineNum: number | null) => {
    if (lineNum === null) return null;
    return (
      <div
        className="flex-shrink-0 text-right pr-3 text-muted-foreground/30 font-mono text-xs select-none pointer-events-none"
        style={{ width: `${gutterWidth + 2}ch`, minWidth: `${gutterWidth + 2}ch`, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
        {lineNum}
      </div>
    );
  };

  const renderNormalLine = (line: string, lineIndex: number) => {
    const level = headingLevel(line);
    const currentLineNum = startLineNumber !== undefined ? startLineNumber + lineIndex : null;

    if (level) {
      const text = line.replace(/^#{1,6}\s+/, '');
      const style = HEADING_STYLES[level] ?? HEADING_STYLES[1];
      return (
        <div key={lineIndex} className="flex group/line">
          {renderGutterCell(currentLineNum)}
          <div
            className={cn('text-foreground flex-1 min-w-0', style)}
            style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
          >
            {text}
          </div>
        </div>
      );
    }

    return (
      <div key={lineIndex} className="flex group/line">
        {renderGutterCell(currentLineNum)}
        <div
          className={cn(
            'text-sm text-foreground/80 font-mono flex-1 min-w-0',
            line.trim() === '' && 'h-0',
          )}
          style={{
            lineHeight: `${SECTION_LINE_HEIGHT}px`,
            minHeight: SECTION_LINE_HEIGHT,
          }}
        >
          {line || '\u00A0'}
        </div>
      </div>
    );
  };

  const renderTableRun = (run: LineRun) => {
    const { lines: tableLines, startIndex } = run;
    // Determine if row 1 is a separator (means row 0 is header)
    const hasSeparator = tableLines.length >= 2 && isTableSeparator(tableLines[1]);
    const alignment = hasSeparator ? parseTableAlignment(tableLines[1]) : [];

    const alignClass = (colIdx: number): string => {
      const a = alignment[colIdx];
      if (a === 'center') return 'text-center';
      if (a === 'right') return 'text-right';
      return 'text-left';
    };

    return tableLines.map((tline, ti) => {
      const lineIndex = startIndex + ti;
      const currentLineNum = startLineNumber !== undefined ? startLineNumber + lineIndex : null;
      const isSep = isTableSeparator(tline);
      const isHeader = ti === 0 && hasSeparator;
      const cells = parseTableCells(tline);

      return (
        <div key={lineIndex} className="flex group/line">
          {renderGutterCell(currentLineNum)}
          <div
            className="flex-1 min-w-0 flex"
            style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
          >
            {isSep ? (
              <div className="flex-1 border-b border-border/40" />
            ) : (
              <div className="flex-1 flex">
                {cells.map((cell, ci) => (
                  <div
                    key={ci}
                    className={cn(
                      'flex-1 px-2 text-sm',
                      isHeader ? 'font-semibold text-foreground' : 'text-foreground/80',
                      alignClass(ci),
                      ci > 0 && 'border-l border-border/20',
                    )}
                  >
                    {cell || '\u00A0'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={cn('select-none', className)}>
      {runs.map((run, ri) => {
        if (run.type === 'table') {
          return <React.Fragment key={`table-${ri}`}>{renderTableRun(run)}</React.Fragment>;
        }
        return (
          <React.Fragment key={`normal-${ri}`}>
            {run.lines.map((line, li) => renderNormalLine(line, run.startIndex + li))}
          </React.Fragment>
        );
      })}
    </div>
  );
};
