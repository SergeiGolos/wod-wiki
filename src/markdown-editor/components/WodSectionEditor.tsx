/**
 * WodSectionEditor
 * 
 * Monaco-based inline editor for WOD block sections.
 * Provides syntax highlighting, semantic tokens, inlay hints,
 * and auto-complete for WOD syntax — all within a lightweight
 * single-section Monaco instance.
 * 
 * Uses the existing "wod-wiki-syntax" language registration
 * and semantic token providers.
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import { editor, IDisposable } from 'monaco-editor';
import type { Section } from '../types/section';
import { VALID_WOD_DIALECTS, type WodDialect } from '../types/section';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { ParseError } from '../types';
import { SECTION_LINE_HEIGHT } from './SectionContainer';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';
import { parseWodBlock } from '../utils/parseWodBlock';
import { sharedParser } from '@/parser/parserInstance';
import { WodWikiSyntaxInitializer } from '@/editor/WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from '@/editor/SemantcTokenEngine';
import { SuggestionEngine } from '@/editor/SuggestionEngine';
import { DefaultSuggestionService } from '@/editor/SuggestionService';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WodBlock } from '../types';

/** Token definitions for semantic highlighting and inlay hints */
const tokens = [
  { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" as const }] },
  { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: 'x', position: "after" as const }] },
  { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [{ hint: '💪', position: "before" as const }] },
  { token: "distance", foreground: "008800", fontStyle: "bold", hints: [] },
  { token: "effort", foreground: "000000", hints: [] },
  { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after" as const, offSet: -1 }] },
];

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

/**
 * Extract the inner WOD content from a section's rawContent.
 * Strips the opening dialect fence (```wod, ```log, ```plan) and closing ```.
 */
function extractInnerContent(rawContent: string): string {
  const lines = rawContent.split('\n');
  // Find opening fence — any recognised dialect
  const openIdx = lines.findIndex(l => {
    const t = l.trim().toLowerCase();
    return VALID_WOD_DIALECTS.some(d => t === '```' + d || t.startsWith('```' + d + ' '));
  });
  // Find closing fence (```)
  let closeIdx = -1;
  for (let i = lines.length - 1; i > openIdx; i--) {
    if (lines[i].trim() === '```') {
      closeIdx = i;
      break;
    }
  }

  if (openIdx === -1) return rawContent; // No fence found, return as-is
  const startLine = openIdx + 1;
  const endLine = closeIdx > openIdx ? closeIdx : lines.length;
  return lines.slice(startLine, endLine).join('\n');
}

/**
 * Re-wrap inner content with fence lines to produce full rawContent.
 * Uses the section's dialect (defaults to 'wod').
 */
function wrapWithFences(innerContent: string, dialect: WodDialect = 'wod'): string {
  return '```' + dialect + '\n' + innerContent + '\n```';
}

export const WodSectionEditor: React.FC<WodSectionEditorProps> = ({
  section,
  onChange,
  lineNumberOffset: _lineNumberOffset,
  initialCursorPosition,
  onBoundaryReached,
  onDeactivate,
  onStartWorkout,
  className,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState(SECTION_LINE_HEIGHT * 3);
  const innerContent = extractInnerContent(section.rawContent);
  const disposablesRef = useRef<IDisposable[]>([]);
  const initializerRef = useRef<WodWikiSyntaxInitializer | null>(null);

  // Live-parse state for the preview panel
  const [liveStatements, setLiveStatements] = useState<ICodeStatement[]>([]);
  const [liveErrors, setLiveErrors] = useState<ParseError[]>([]);

  // Create the syntax initializer once per mount
  const initializer = useMemo(() => {
    const init = new WodWikiSyntaxInitializer(
      new SemantcTokenEngine(tokens),
      new SuggestionEngine(new DefaultSuggestionService()),
      undefined, // onChange for IScript — we handle our own
      `wod-section-${section.id}`,
      false,
    );
    initializerRef.current = init;
    return init;
  }, [section.id]);

  // Parse initial content on mount
  useMemo(() => {
    if (innerContent.trim()) {
      try {
        const result = parseWodBlock(innerContent, sharedParser);
        setLiveStatements(result.statements);
        setLiveErrors(result.errors);
      } catch {
        setLiveStatements([]);
        setLiveErrors([{ message: 'Parse error', severity: 'error' }]);
      }
    }
  }, []); // Only on mount — subsequent updates from editor onChange

  /** Parse content and update live preview */
  const updateLivePreview = useCallback((content: string) => {
    if (!content.trim()) {
      setLiveStatements([]);
      setLiveErrors([]);
      return;
    }
    try {
      const result = parseWodBlock(content, sharedParser);
      setLiveStatements(result.statements);
      setLiveErrors(result.errors);
    } catch {
      setLiveStatements([]);
      setLiveErrors([{ message: 'Parse error', severity: 'error' }]);
    }
  }, []);

  /**
   * Editor options — uses wod-wiki syntax with semantic highlighting.
   * Scrollbar enabled only when content exceeds MAX_EDITOR_HEIGHT.
   */
  const needsScroll = editorHeight > MAX_EDITOR_HEIGHT;
  const clampedHeight = Math.min(editorHeight, MAX_EDITOR_HEIGHT);

  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    language: 'wod-wiki-syntax',
    theme: 'wod-wiki-theme',
    automaticLayout: true,
    lineNumbers: 'off',
    folding: false,
    renderLineHighlight: 'line',
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: SECTION_LINE_HEIGHT,
    padding: { top: 0, bottom: 0 },
    minimap: { enabled: false },
    inlayHints: { enabled: 'on' },
    readOnly: false,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    renderLineHighlightOnlyWhenFocus: true,
    scrollbar: {
      vertical: needsScroll ? 'auto' : 'hidden',
      horizontal: 'hidden',
      verticalScrollbarSize: needsScroll ? 8 : 0,
      horizontalScrollbarSize: 0,
      alwaysConsumeMouseWheel: false,
    },
    wordWrap: 'on',
    'semanticHighlighting.enabled': true,
  };

  /** Register language, themes, semantic tokens, inlay hints, completions */
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    initializer.handleBeforeMount(monaco);
  }, [initializer]);

  const handleEditorMount = useCallback((
    mountedEditor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = mountedEditor;

    // Wire the initializer (parses content, sets up semantic tokens + inlay hints)
    initializer.handleMount(mountedEditor, monaco);

    // Set initial cursor position
    if (initialCursorPosition) {
      // Adjust for fence line offset: cursor line 0 in section → line 1 in inner content
      const innerLine = Math.max(1, initialCursorPosition.line); // fence line is line 0
      mountedEditor.setPosition({
        lineNumber: innerLine,
        column: Math.max(1, initialCursorPosition.column + 1),
      });
    }
    mountedEditor.focus();

    // Auto-resize to content
    const updateHeight = () => {
      const contentHeight = mountedEditor.getContentHeight();
      setEditorHeight(Math.max(contentHeight, SECTION_LINE_HEIGHT));
      mountedEditor.layout();
    };
    updateHeight();

    // Listen for content size changes
    const sizeDisposable = mountedEditor.onDidContentSizeChange(updateHeight);
    disposablesRef.current.push(sizeDisposable);

    // Content change → notify parent with full fence-wrapped rawContent + live preview
    const contentDisposable = mountedEditor.onDidChangeModelContent(() => {
      const newInnerContent = mountedEditor.getValue();
      const newRawContent = wrapWithFences(newInnerContent, section.dialect ?? 'wod');
      onChange(newRawContent);
      updateLivePreview(newInnerContent);
    });
    disposablesRef.current.push(contentDisposable);

    // Boundary detection via keydown
    const keyDisposable = mountedEditor.onKeyDown((e) => {
      const position = mountedEditor.getPosition();
      if (!position) return;

      const model = mountedEditor.getModel();
      if (!model) return;

      const totalLines = model.getLineCount();

      // Escape → deactivate
      if (e.keyCode === 9 /* Escape */) {
        e.preventDefault();
        e.stopPropagation();
        onDeactivate?.();
        return;
      }

      // ArrowUp at first line → boundary top
      if (e.keyCode === 16 /* UpArrow */ && position.lineNumber === 1 && !e.ctrlKey) {
        onBoundaryReached?.('top');
        return;
      }

      // ArrowDown at last line → boundary bottom
      if (e.keyCode === 18 /* DownArrow */ && position.lineNumber === totalLines && !e.ctrlKey) {
        onBoundaryReached?.('bottom');
        return;
      }

      // Ctrl+ArrowUp → always jump up
      if (e.keyCode === 16 /* UpArrow */ && e.ctrlKey) {
        e.preventDefault();
        onBoundaryReached?.('top');
        return;
      }

      // Ctrl+ArrowDown → always jump down
      if (e.keyCode === 18 /* DownArrow */ && e.ctrlKey) {
        e.preventDefault();
        onBoundaryReached?.('bottom');
        return;
      }
    });
    disposablesRef.current.push(keyDisposable);

    // Blur → deactivate (with delay to allow focus changes)
    const blurDisposable = mountedEditor.onDidBlurEditorWidget(() => {
      // Small delay to check if focus moved within the section editor
      setTimeout(() => {
        if (!mountedEditor.hasWidgetFocus()) {
          onDeactivate?.();
        }
      }, 100);
    });
    disposablesRef.current.push(blurDisposable);
  }, [initialCursorPosition, onChange, onBoundaryReached, onDeactivate, updateLivePreview]);

  // Cleanup disposables and initializer on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
      initializerRef.current?.handleUnmount();
    };
  }, []);

  return (
    <div className={cn('wod-section-editor rounded overflow-hidden border border-primary/30', className)}>
      {/* Fence top indicator */}
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

      {/* Split view: Editor | Preview */}
      <div className="flex" style={{ minHeight: Math.min(editorHeight, MAX_EDITOR_HEIGHT) }}>
        {/* Left: Monaco editor */}
        <div className="flex-1 min-w-0 border-r border-border/30" style={{ height: clampedHeight }}>
          <Editor
            height={clampedHeight}
            defaultLanguage="wod-wiki-syntax"
            defaultValue={innerContent}
            options={editorOptions}
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
          />
        </div>

        {/* Right: Live preview */}
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

      {/* Fence bottom indicator */}
      <div
        className="px-2 text-[10px] text-muted-foreground/40 font-mono border-t border-border/30 bg-muted/30"
        style={{ height: SECTION_LINE_HEIGHT, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
        {/* Closing fence visual */}
      </div>
    </div>
  );
};
