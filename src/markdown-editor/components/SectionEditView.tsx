/**
 * SectionEditView
 * 
 * Inline editor for a single section (heading or paragraph).
 * Uses a plain <textarea> that auto-sizes to content and reports
 * boundary events for keyboard navigation between sections.
 * 
 * WOD sections use WodSectionEditor instead (Monaco-based).
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { Section } from '../types/section';
import { VALID_WOD_DIALECTS, type WodDialect } from '../types/section';
import { SECTION_LINE_HEIGHT } from './SectionContainer';
import { cn } from '@/lib/utils';

export interface SectionEditViewProps {
  /** The section being edited */
  section: Section;
  /** Called on every content change */
  onChange: (newContent: string) => void;
  /** Initial cursor position (line within section, 0-indexed) */
  initialCursorPosition?: { line: number; column: number };
  /** Called when cursor moves to report position */
  onCursorMove?: (position: { line: number; column: number }) => void;
  /** Called when cursor hits top or bottom boundary */
  onBoundaryReached?: (boundary: 'top' | 'bottom', event: React.KeyboardEvent) => void;
  /** Called when user requests a new section (Enter on empty trailing line) */
  onNewSectionRequest?: () => void;
  /** Called when section should deactivate (Escape or blur) */
  onDeactivate?: () => void;
  /** Called when a heading section should split at cursor (Enter in heading) */
  onSplitSection?: (beforeContent: string, afterContent: string) => void;
  /** Called when user types a dialect fence (```wod, ```log, ```plan) to convert into a WOD block */
  onConvertToWod?: (contentBefore: string, wodBodyContent: string, dialect?: WodDialect) => void;
  /** The section type (used for type-specific behavior) */
  sectionType?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compute line and column from a string offset within text.
 */
function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.substring(0, offset);
  const lines = before.split('\n');
  return {
    line: lines.length - 1, // 0-indexed
    column: lines[lines.length - 1].length,
  };
}

/**
 * Compute string offset from line and column.
 */
function lineColumnToOffset(text: string, line: number, column: number): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < Math.min(line, lines.length); i++) {
    offset += lines[i].length + 1; // +1 for \n
  }
  const targetLine = lines[Math.min(line, lines.length - 1)] ?? '';
  offset += Math.min(column, targetLine.length);
  return offset;
}

export const SectionEditView: React.FC<SectionEditViewProps> = ({
  section,
  onChange,
  initialCursorPosition,
  onCursorMove,
  onBoundaryReached,
  onNewSectionRequest,
  onDeactivate,
  onSplitSection,
  onConvertToWod,
  sectionType,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitializedCursor = useRef(false);

  // Auto-focus and set cursor position on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || hasInitializedCursor.current) return;

    textarea.focus();

    if (initialCursorPosition) {
      const offset = lineColumnToOffset(
        textarea.value,
        initialCursorPosition.line,
        initialCursorPosition.column,
      );
      textarea.setSelectionRange(offset, offset);
    } else {
      // Default: end of content
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }

    hasInitializedCursor.current = true;
  }, [initialCursorPosition]);

  // Auto-resize textarea height to match content
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineCount = textarea.value.split('\n').length;
    textarea.style.height = `${lineCount * SECTION_LINE_HEIGHT}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [autoResize]);

  // Handle text changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    // Detect dialect fences (```wod, ```log, ```plan) typed in a markdown or title section — auto-convert to WOD block
    if ((sectionType === 'markdown' || sectionType === 'title') && onConvertToWod) {
      const lines = newContent.split('\n');
      for (const dialect of VALID_WOD_DIALECTS) {
        const fenceLineIdx = lines.findIndex(l => {
          const trimmed = l.trim().toLowerCase();
          return trimmed === '```' + dialect || trimmed.startsWith('```' + dialect + ' ');
        });
        if (fenceLineIdx !== -1) {
          // Content before the fence line stays in this section
          const contentBefore = lines.slice(0, fenceLineIdx).join('\n');
          // Content after the fence line becomes the WOD block body
          const contentAfter = lines.slice(fenceLineIdx + 1).join('\n');
          onConvertToWod(contentBefore, contentAfter, dialect);
          return;
        }
      }
    }

    onChange(newContent);
    // Resize after content change
    requestAnimationFrame(autoResize);
  }, [onChange, autoResize, sectionType, onConvertToWod]);

  // Report cursor position on selection change
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorMove) return;
    const pos = offsetToLineColumn(textarea.value, textarea.selectionStart);
    onCursorMove(pos);
  }, [onCursorMove]);

  // Handle keyboard events for boundary detection
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, value } = textarea;
    const pos = offsetToLineColumn(value, selectionStart);
    const lines = value.split('\n');
    const totalLines = lines.length;

    // Escape → deactivate
    if (e.key === 'Escape') {
      e.preventDefault();
      onDeactivate?.();
      return;
    }

    // ArrowUp at first line → boundary top
    if (e.key === 'ArrowUp' && !e.ctrlKey && pos.line === 0) {
      onBoundaryReached?.('top', e);
      return;
    }

    // ArrowDown at last line → boundary bottom
    if (e.key === 'ArrowDown' && !e.ctrlKey && pos.line === totalLines - 1) {
      onBoundaryReached?.('bottom', e);
      return;
    }

    // Ctrl+ArrowUp → always jump to previous section
    if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      onBoundaryReached?.('top', e);
      return;
    }

    // Ctrl+ArrowDown → always jump to next section
    if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      onBoundaryReached?.('bottom', e);
      return;
    }

    // Shift+Enter / Enter in paragraph: Handled by default (insert newline)
    // We remove the automatic new section creation from empty trailing lines.
  }, [onBoundaryReached, onNewSectionRequest, onDeactivate, sectionType, onSplitSection]);

  // Handle blur → deactivate
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't deactivate if focus is moving to another element within the section editor
    // (e.g., clicking a button inside the section). Check if the related target
    // is within the section-editor parent.
    const sectionEditor = (e.target as HTMLElement).closest('.section-editor');
    if (sectionEditor && e.relatedTarget && sectionEditor.contains(e.relatedTarget as Node)) {
      return;
    }
    onDeactivate?.();
  }, [onDeactivate]);

  return (
    <textarea
      ref={textareaRef}
      value={section.rawContent}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onSelect={handleSelect}
      onBlur={handleBlur}
      className={cn(
        'w-full resize-none border-none outline-none bg-transparent',
        'text-sm font-mono text-foreground',
        'p-0 m-0',
        className,
      )}
      style={{
        lineHeight: `${SECTION_LINE_HEIGHT}px`,
        fontSize: '14px',
        overflow: 'hidden',
        minHeight: SECTION_LINE_HEIGHT,
      }}
      rows={section.lineCount}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
};
