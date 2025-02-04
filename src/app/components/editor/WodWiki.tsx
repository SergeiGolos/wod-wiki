import Editor from '@monaco-editor/react';
import React, { useEffect } from 'react';
import { WodRuntimeScript, WodWikiToken } from '../../../lib/md-timer';
import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface WodWikiProps {
  id: string;
  code?: string;  
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

export const WodWiki = ({ id, code = "", onValueChange }: WodWikiProps) => {        
    let _monaco: Monaco | undefined;
    let _editor: editor.IStandaloneCodeEditor | undefined;
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(), onValueChange);      
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      _editor = editor;
      initializer.handleMount(editor, monaco);
    }
    function handleBeforeMount(monaco: Monaco) {
      _monaco = monaco;
      initializer.handleBeforeMount(monaco);
    }
    function handleEditorValidation(markers: editor.IMarker[]) {
      // model markers
      markers.forEach((marker) => console.log('onValidate:', marker.message));
    }
        
  useEffect(() => {
    // This code runs when the component mounts (first render)
    console.log('Mount', _editor?.getModel());
    // Return a cleanup function
    return () => {
      initializer.handleUnmount();
      // This code runs when the component unmounts
      // - Remove event listeners
    };
  }, []); // The empty dependency array ensures this runs only once on mount and unmount

    return (
      <Editor
        height="30vh"    
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
