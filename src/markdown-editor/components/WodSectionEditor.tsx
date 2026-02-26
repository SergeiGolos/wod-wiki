import React, { useCallback, useState, useMemo } from 'react';
import type { Section } from '../types/section';
import { VALID_WOD_DIALECTS, type WodDialect } from '../types/section';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { ParseError } from '../types';
import { SECTION_LINE_HEIGHT } from './SectionContainer';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';
import { parseWodBlock } from '../utils/parseWodBlock';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WodBlock } from '../types';
import { CodeMirrorEditor } from '../../components/Editor/CodeMirrorEditor';

/** Max editor height before scrolling kicks in */
const MAX_EDITOR_HEIGHT = SECTION_LINE_HEIGHT * 12; // ~12 lines max

export interface WodSectionEditorProps {
  /** The WOD section being edited */
  section: Section;
  /** Called on every content change (inner WOD content, without fences) */
  onChange: (newContent: string) => void;
  /** Line number offset for display (0-indexed absolute start line of section) */
  lineNumberOffset: number;
  /** Initial cursor position (line within section, 0-indexed) */
  initialCursorPosition?: { line: number; column: number };
  /** Called when cursor hits top or bottom boundary */
  onBoundaryReached?: (boundary: 'top' | 'bottom') => void;
  /** Called when section should deactivate */
  onDeactivate?: () => void;
  /** Called when user clicks the Run button */
  onStartWorkout?: (wodBlock: WodBlock) => void;
  /** Additional CSS classes */
  className?: string;
}

function extractInnerContent(rawContent: string): string {
  const lines = rawContent.split('\n');
  const openIdx = lines.findIndex(l => {
    const t = l.trim().toLowerCase();
    return VALID_WOD_DIALECTS.some(d => t === '```' + d || t.startsWith('```' + d + ' '));
  });
  let closeIdx = -1;
  for (let i = lines.length - 1; i > openIdx; i--) {
    if (lines[i].trim() === '```') {
      closeIdx = i;
      break;
    }
  }
  if (openIdx === -1) return rawContent;
  const startLine = openIdx + 1;
  const endLine = closeIdx > openIdx ? closeIdx : lines.length;
  return lines.slice(startLine, endLine).join('\n');
}

function wrapWithFences(innerContent: string, dialect: WodDialect = 'wod'): string {
  return '```' + dialect + '\n' + innerContent + '\n```';
}

export const WodSectionEditor: React.FC<WodSectionEditorProps> = ({
  section,
  onChange,
  lineNumberOffset: _lineNumberOffset,
  initialCursorPosition: _initialCursorPosition,
  onBoundaryReached: _onBoundaryReached,
  onDeactivate: _onDeactivate,
  onStartWorkout,
  className,
}) => {
  const innerContent = extractInnerContent(section.rawContent);
  const [liveStatements, setLiveStatements] = useState<ICodeStatement[]>([]);
  const [liveErrors, setLiveErrors] = useState<ParseError[]>([]);

  // Parse initial content on mount
  useMemo(() => {
    if (innerContent.trim()) {
      const result = parseWodBlock(innerContent);
      setLiveStatements(result.statements);
      setLiveErrors(result.errors);
    }
  }, []);

  const handleEditorChange = useCallback((content: string) => {
    const newRawContent = wrapWithFences(content, section.dialect ?? 'wod');
    onChange(newRawContent);
    
    const result = parseWodBlock(content);
    setLiveStatements(result.statements);
    setLiveErrors(result.errors);
  }, [onChange, section.dialect]);

  return (
    <div className={cn('wod-section-editor rounded overflow-hidden border border-primary/30', className)}>
      <div
        className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground/60 font-mono border-b border-border/30 bg-muted/30"
        style={{ height: SECTION_LINE_HEIGHT, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
        <span>wod</span>
        <div className="flex-1" />
        {onStartWorkout && section.wodBlock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartWorkout(section.wodBlock!);
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium transition-colors shadow-sm',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            title="Run this workout"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Run</span>
          </button>
        )}
        <span className={cn(
          'text-[9px] px-1.5 py-0.5 rounded',
          liveErrors.length > 0
            ? 'text-destructive bg-destructive/10'
            : liveStatements.length > 0
              ? 'text-emerald-500 bg-emerald-500/10'
              : 'text-muted-foreground/40'
        )}>
          {liveErrors.length > 0
            ? `${liveErrors.length} error${liveErrors.length > 1 ? 's' : ''}`
            : liveStatements.length > 0
              ? `${liveStatements.length} statement${liveStatements.length > 1 ? 's' : ''}`
              : 'empty'}
        </span>
      </div>

      <div className="flex" style={{ minHeight: SECTION_LINE_HEIGHT * 3 }}>
        <div className="flex-1 min-w-0 border-r border-border/30 max-h-[300px] overflow-auto">
          <CodeMirrorEditor
            value={innerContent}
            onChange={handleEditorChange}
            theme="vs"
          />
        </div>

        <div className="flex-1 min-w-0 bg-card/30 overflow-auto px-2">
          {liveStatements.length > 0 ? (
            <div className="py-1 space-y-0.5">
              {liveStatements.map((stmt, i) => (
                <StatementDisplay
                  key={i}
                  statement={stmt}
                  compact
                  isGrouped
                />
              ))}
            </div>
          ) : liveErrors.length > 0 ? (
            <div className="py-1">
              {liveErrors.map((err, i) => (
                <div key={i} className="text-[11px] text-destructive py-0.5">
                  <span className="font-mono">⚠</span> {err.message}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-[11px] text-muted-foreground/50 italic">
              Type WOD syntax to see preview...
            </div>
          )}
        </div>
      </div>

      <div
        className="px-2 text-[10px] text-muted-foreground/40 font-mono border-t border-border/30 bg-muted/30"
        style={{ height: SECTION_LINE_HEIGHT, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
      </div>
    </div>
  );
};
