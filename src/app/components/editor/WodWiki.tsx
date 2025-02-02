import Editor from '@monaco-editor/react';

import { WodRuntimeScript, WodWikiToken } from '../../../lib/md-timer';
import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface WodWikiProps {
  code?: string;  
  /** Optional value change handler */
  onValueChange?: (classObject?: WodRuntimeScript) => void;    
}

const tokens: WodWikiToken[] = [
  { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" }] },
  { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: ' x', position: "after" }] },
  { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [] },
  { token: "distance", foreground: "008800", fontStyle: "bold", hints: [] },
  { token: "effort", foreground: "000000", hints: [] },
  { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after" }] },
]

export const WodWiki = ({ code = "", onValueChange }: WodWikiProps) => {        
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(), onValueChange);      
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      initializer.handleMount(editor, monaco);
    }
    function handleBeforeMount(monaco: Monaco) {
      initializer.handleBeforeMount(monaco);
    }
        
    return (
      <Editor
        height="30vh"    
        language={initializer.syntax} 
        theme={initializer.theme}
        defaultValue={code}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={initializer.options}        
    />
    )
  };   
