import { useEffect, useRef, useState } from 'react';

import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';
import { editor } from 'monaco-editor';
import Editor, { MonacoDiffEditor } from '@monaco-editor/react';
import { Monaco } from '@monaco-editor/react';

import { DefaultSuggestionService } from './SuggestionService';
import { IScript } from '../WodRuntimeScript';
import { CodeMetadata } from '../CodeMetadata';

interface WodWikiProps {
  id: string;
  code?: string;
  cursor?: CodeMetadata | undefined;  
  /** Optional value change handler */
  onValueChange?: (classObject?: IScript) => void;
  /** Optional callback when editor is mounted */
  onMount?: (editor: any) => void;    
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




export const WodWiki = ({ id, code = "", cursor = undefined, onValueChange, onMount }: WodWikiProps) => {        
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(new DefaultSuggestionService()), onValueChange);      
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [height, setHeight] = useState(50); // Initial height
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      editorRef.current = editor;
      monacoRef.current = monaco;
      initializer.handleMount(editor, monaco);
      if (onMount) {
        onMount(editor);
      }
      editor.onDidContentSizeChange(() => {
        handleContentSizeChange();
      });
    };
  
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
  
    return (
      <Editor
        height={`${height}px`}
        path={id}
        language={initializer.syntax} 
        theme={initializer.theme}        
        defaultValue={code}
        beforeMount={handleBeforeMount}      
        onMount={handleMount}     
        onValidate={handleEditorValidation}   
        options={initializer.options}        
    />
    )
  };   
