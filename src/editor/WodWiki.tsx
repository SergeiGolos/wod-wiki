import React, { useEffect, useRef, useState } from 'react';

import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';
import { editor } from 'monaco-editor';
import Editor, { MonacoDiffEditor } from '@monaco-editor/react';
import { Monaco } from '@monaco-editor/react';

import { DefaultSuggestionService } from './SuggestionService';
import { IScript } from '../parser/WodScript';
import { CodeMetadata } from '../core/models/CodeMetadata';
import { ExerciseDataProvider } from '../types/providers';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import { RichMarkdownManager } from './RichMarkdownManager';
import { HiddenAreasCoordinator } from './utils/HiddenAreasCoordinator';

interface WodWikiProps {
  id: string;
  code?: string;
  cursor?: CodeMetadata | undefined;  
  /** Optional value change handler */
  onValueChange?: (classObject?: IScript) => void;
  /** Optional callback when editor is mounted */
  onMount?: (editor: any) => void;
  /** Whether the editor is read-only */
  readonly?: boolean;
  /** Line number to highlight */
  highlightedLine?: number;
  /** Optional exercise data provider for suggestions and hover */
  exerciseProvider?: ExerciseDataProvider;
  /** Editor theme */
  theme?: string;
}

export interface WodWikiTokenHint {
  hint: string;
  position: "after" | "before";
  offSet?: number | undefined;
}

export interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints?: WodWikiTokenHint[];
}

const tokens: WodWikiToken[] = [
  { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" }] },
  { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: 'x', position: "after" }] },
  { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [{ hint: '💪', position: "before" }] },
  { token: "distance", foreground: "008800", fontStyle: "bold", hints: []},
  { token: "effort", foreground: "000000", hints: [] },
  { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after", offSet: -1 }] },
]




export const WodWiki = ({ id, code = "", cursor = undefined, onValueChange, onMount, readonly = false, highlightedLine, exerciseProvider, theme = "wod-wiki-theme" }: WodWikiProps) => {        
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(new DefaultSuggestionService()), onValueChange, id, readonly);      
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const richMarkdownManagerRef = useRef<RichMarkdownManager | null>(null);
    const hiddenAreasCoordinatorRef = useRef<HiddenAreasCoordinator | null>(null);
    const [height, setHeight] = useState(50); // Initial height
    const [highlightedLineData, setHighlightedLineData] = useState<number | null>(null);
    
    // Configure exercise provider when it changes
    useEffect(() => {
      if (exerciseProvider) {
        const manager = ExerciseIndexManager.getInstance();
        manager.setProvider(exerciseProvider);
        console.log('[WodWiki] Exercise provider configured');
      }
    }, [exerciseProvider]);
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      editorRef.current = editor;
      monacoRef.current = monaco;
      initializer.handleMount(editor, monaco);

      // Initialize Hidden Areas Coordinator
      hiddenAreasCoordinatorRef.current = new HiddenAreasCoordinator(editor, monaco);

      // Initialize Rich Markdown Manager
      richMarkdownManagerRef.current = new RichMarkdownManager(editor, undefined, hiddenAreasCoordinatorRef.current);

      if (onMount) {
        onMount(editor);
      }
      
      // Apply theme AFTER initializer has defined custom themes
      if (theme) {
        console.log('[WodWiki] Applying theme:', theme);
        monaco.editor.setTheme(theme);
      }
      
      editor.onDidContentSizeChange(() => {
        handleContentSizeChange();
      });
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (richMarkdownManagerRef.current) {
          richMarkdownManagerRef.current.dispose();
        }
      };
    }, []);
  
    const handleContentSizeChange = () => {
      if (editorRef.current) {
        const newHeight = Math.min(500, editorRef.current.getContentHeight()); // Example max height of 500px
        setHeight(newHeight);
        editorRef.current.layout();
      }
    }
    
    function handleBeforeMount(monaco: Monaco) {
      initializer.handleBeforeMount(monaco);
    }
    
    function handleEditorValidation(_markers: editor.IMarker[]) {
      // model markers - processing removed
    }
        
  useEffect(() => {
    // This code runs when the component mounts (first render)
    // Return a cleanup function
    return () => {
      initializer.handleUnmount();
      // This code runs when the component unmounts
      // - Remove event listeners
    };
  }, []); // The empty dependency array ensures this runs only once on mount and unmount

  // Effect for highlighting the cursor line
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || cursor == null) return;
    // Access cursor line safely with proper type handling
    const line = cursor && 'stack' in cursor && Array.isArray(cursor.stack) && cursor.stack.length > 0 
      ? cursor.stack[0]?.meta?.line ?? -1 
      : -1;
    // Add a decoration to highlight the current line
    const decorations = editorRef.current.createDecorationsCollection([
      {
        range: new monacoRef.current.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'currentLineDecoration',
          glyphMarginClassName: 'currentLineGlyphMargin'
        }
      }
    ]);
    
    return () => {
      if (editorRef.current) {
        decorations.clear();
      }
    };
  }, [cursor]);

  // Effect for highlighting specified line
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || highlightedLine == null || highlightedLine <= 0) return;
    
    const decorations = editorRef.current.createDecorationsCollection([
      {
        range: new monacoRef.current.Range(highlightedLine, 1, highlightedLine, 1),
        options: {
          isWholeLine: true,
          className: 'highlightedLineDecoration',
          glyphMarginClassName: 'highlightedLineGlyphMargin'
        }
      }
    ]);
    
    return () => {
      if (editorRef.current) {
        decorations.clear();
      }
    };
  }, [highlightedLine]);

  // Update theme when prop changes
  useEffect(() => {
    if (monacoRef.current && theme) {
      console.log('[WodWiki] Theme changed to:', theme);
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme]);
  
    return (
      <div data-highlighted-line={highlightedLine} className="wodwiki-container">
        <Editor
          height={`${height}px`}
          path={id}
          language={initializer.syntax} 
          defaultValue={code}
          beforeMount={handleBeforeMount}      
          onMount={handleMount}     
          onValidate={handleEditorValidation}   
          options={initializer.options}        
      />
      </div>
    )
  };
