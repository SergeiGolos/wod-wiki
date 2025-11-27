import React, { useRef, useEffect, useState } from 'react';
import { editor } from 'monaco-editor';
import { WodBlockCardProps, WodBlockContent } from '../types';
import { StatementDisplay } from '../../../components/fragments/StatementDisplay';
import { Button } from '../../../components/ui/button';
import { Play, Timer, Edit3, Eye } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * WodBlockCard - Side-by-side Code | Preview component
 * When displayMode is 'side-by-side', shows an embedded Monaco editor on the left side
 */
export const WodBlockCard: React.FC<WodBlockCardProps> = ({
  card,
  callbacks,
  monaco
}) => {
  const content = card.content as WodBlockContent;
  const hasStatements = content.statements && content.statements.length > 0;
  const rawCode = content.rawCode || '';
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const miniEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [localCode, setLocalCode] = useState(rawCode);
  
  const isEditing = card.displayMode === 'side-by-side';

  // Update local code when block content changes externally
  useEffect(() => {
    setLocalCode(content.rawCode || '');
    if (miniEditorRef.current && miniEditorRef.current.getValue() !== (content.rawCode || '')) {
      miniEditorRef.current.setValue(content.rawCode || '');
    }
  }, [content.rawCode]);

  // Create/destroy mini Monaco editor when editing state changes
  useEffect(() => {
    if (isEditing && editorContainerRef.current && monaco) {
      // Create a mini Monaco editor for inline editing
      const miniEditor = monaco.editor.create(editorContainerRef.current, {
        value: localCode,
        language: 'wod', // Use wod language if registered, falls back to plaintext
        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        fontSize: 12,
        fontFamily: 'var(--font-mono, monospace)',
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: 'none',
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
          verticalScrollbarSize: 8
        },
        theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs'
      });

      miniEditorRef.current = miniEditor;

      // Listen for changes and propagate them
      const changeDisposable = miniEditor.onDidChangeModelContent(() => {
        const newValue = miniEditor.getValue();
        setLocalCode(newValue);
        if (callbacks.onContentChange) {
          callbacks.onContentChange(newValue);
        }
      });

      // Focus the mini editor when it's created
      setTimeout(() => {
        miniEditor.focus();
      }, 50);

      return () => {
        changeDisposable.dispose();
        miniEditor.dispose();
        miniEditorRef.current = null;
      };
    }
  }, [isEditing, monaco]);

  return (
    <div className="wod-split-view h-full flex bg-card border border-border rounded-lg overflow-hidden shadow-md">
      {/* Left side: Code Editor or Static Display */}
      <div className="w-1/2 h-full border-r border-border flex flex-col overflow-hidden bg-muted/10">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {isEditing ? 'Editing' : 'Code'}
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={callbacks.onEdit}
              className="px-2 py-0.5 rounded hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
            >
              Edit
            </button>
          )}
        </div>
        {isEditing && monaco ? (
          <div 
            ref={editorContainerRef} 
            className="flex-1 min-h-0"
            style={{ height: '100%' }}
          />
        ) : (
          <pre 
            className="flex-1 p-3 text-xs font-mono whitespace-pre-wrap text-foreground/80 overflow-auto cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={callbacks.onEdit}
            title="Click to edit"
          >
            {rawCode}
          </pre>
        )}
      </div>
      
      {/* Right side: Preview */}
      <div className="w-1/2 h-full flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Preview</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              content.parseState === 'parsed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            )}>
              {content.parseState}
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col justify-center">
          {hasStatements ? (
            content.statements?.map((statement, index) => (
              <StatementDisplay key={index} statement={statement} compact={false} />
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic text-center py-4">
              {content.parseState === 'error' ? <span className="text-destructive">Parse error</span> : 'No statements'}
            </div>
          )}
        </div>
        
        {content.parseState === 'parsed' && hasStatements && (
          <div className="p-3 border-t border-border flex-shrink-0">
            <Button 
              onClick={() => callbacks.onAction('start-workout')} 
              className="w-full gap-2" 
              size="default" 
              data-no-edit
            >
              <Play className="h-4 w-4" />
              Run Workout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
