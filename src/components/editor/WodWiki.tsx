import Editor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { WodWikiSyntaxInitializer } from '../hooks/WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from '../hooks/SemantcTokenEngine';
import { SuggestionEngine } from '../hooks/SuggestionEngine';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { DefaultSuggestionService } from '../hooks/SuggestionService';
import { IRuntimeBlock, WodRuntimeScript, WodWikiToken } from '@/core/timer.types';

interface WodWikiProps {
  id: string;
  code?: string;
  cursor: IRuntimeBlock | undefined;  
  /** Optional value change handler */
  onValueChange?: (classObject?: WodRuntimeScript) => void;    
}

const tokens: WodWikiToken[] = [
  { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" }] },
  { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: 'x', position: "after" }] },
  { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [{ hint: '💪', position: "before" }] },
  { token: "distance", foreground: "008800", fontStyle: "bold", hints: []},
  { token: "effort", foreground: "000000", hints: [] },
  { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after", offSet: -1 }] },
]




export const WodWiki = ({ id, code = "", cursor = undefined, onValueChange }: WodWikiProps) => {        
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(new DefaultSuggestionService()), onValueChange);      
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [height, setHeight] = useState(50); // Initial height
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      editorRef.current = editor;
      monacoRef.current = monaco;
      initializer.handleMount(editor, monaco);
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
    
    function handleEditorValidation(markers: editor.IMarker[]) {
      // model markers
      markers.forEach((marker) => console.log('onValidate:', marker.message));
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
    const line  = cursor.stack?.[0].meta?.line ?? -1;
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
    console.log("Test!!!!!");
    
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
