import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { WodRuntimeScript, WodWikiToken } from '../../../lib/md-timer';
import { editor } from 'monaco-editor';
import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';


interface WodWikiProps {
  code?: string;
  /** Initial code content */
  initializer?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  /** Optional value change handler */
  onValueChange?: (editor: monaco.editor.IStandaloneCodeEditor, event: editor.IModelContentChangedEvent, classObject?: WodRuntimeScript) => void;
  /** Optional cursor position handler */
  onCursorMoved?: (editor: monaco.editor.IStandaloneCodeEditor, event: editor.ICursorPositionChangedEvent, classObject?: WodRuntimeScript) => void;
}

export const WodWiki: React.FC<WodWikiProps> = ({
  code = "",
  onValueChange,
  onCursorMoved,
}) => {  
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);  
  const tokens: WodWikiToken[] = [
    { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" }] },
    { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: ' x', position: "after" }] },
    { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [] },
    { token: "effort", foreground: "000000", hints: [] },
    { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after" }] },
  ]

  const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(), code);  
 
  useEffect(() => {
    if (!containerRef.current) return;
    const [editor, contentChangeDisposable, cursorChangeDisposable] = initializer.createEditor(
      containerRef, 
      (event: editor.IModelContentChangedEvent, objectClass?: WodRuntimeScript) => { onValueChange?.(editorRef.current!, event, objectClass); },
      (event: editor.ICursorPositionChangedEvent, objectClass?: WodRuntimeScript) => { onCursorMoved?.(editorRef.current!, event, objectClass); });

    editorRef.current = editor;
    if (code != "") {
      editorRef.current?.setValue(code); 
    }

    // Subscribe to content change events
    // Cleanup function
    return () => {
      contentChangeDisposable.dispose();
      cursorChangeDisposable.dispose();
      if (editorRef.current) {
        editorRef.current?.dispose();
        editorRef.current = null;
      }
    };
  }, []); // Empty dependency array since we only want to initialize once

  // Update editor content when code prop changes
  useEffect(() => {
    if (editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="w-full border border-gray-200 rounded-lg overflow-hidden"
      style={{ height: `200px` }}
    />
  );
};
