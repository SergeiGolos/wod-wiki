/**
 * Hook for managing bidirectional editing between context panel and Monaco editor
 */

import { useCallback } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../types';

export interface UseBlockEditorOptions {
  /** Monaco editor instance */
  editor: monacoEditor.IStandaloneCodeEditor | null;
  
  /** Current block being edited */
  block: WodBlock | null;
}

export interface UseBlockEditorReturn {
  /** Add a new statement to the block */
  addStatement: (text: string) => void;
  
  /** Edit an existing statement */
  editStatement: (index: number, text: string) => void;
  
  /** Delete a statement */
  deleteStatement: (index: number) => void;
}

/**
 * Hook to manage editing WOD block content from the context panel
 */
export function useBlockEditor({
  editor,
  block
}: UseBlockEditorOptions): UseBlockEditorReturn {
  
  /**
   * Add a new statement to the end of the block
   */
  const addStatement = useCallback((text: string) => {
    if (!editor || !block) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Calculate position to insert (before the closing ```)
    // block.endLine is 0-based index of closing ```
    // In Monaco (1-based), this is block.endLine + 1
    const closingBackticksLine = block.endLine + 1;
    
    // Find the last non-empty line before closing ```
    let lastContentLine = closingBackticksLine - 1;
    let indentation = '';

    // block.startLine is 0-based index of opening ```wod
    // In Monaco (1-based), this is block.startLine + 1
    const openingBackticksLine = block.startLine + 1;

    while (lastContentLine > openingBackticksLine) {
      const content = model.getLineContent(lastContentLine);
      if (content.trim()) {
        // Capture indentation from the last content line
        const match = content.match(/^(\s*)/);
        if (match) indentation = match[1];
        break;
      }
      lastContentLine--;
    }
    
    // Insert new line after last content
    const insertPosition = {
      lineNumber: lastContentLine + 1,
      column: 1
    };
    
    // Format the new line with proper indentation
    const newText = `${indentation}${text}\n`;
    
    editor.executeEdits('fragment-editor', [{
      range: {
        startLineNumber: insertPosition.lineNumber,
        startColumn: insertPosition.column,
        endLineNumber: insertPosition.lineNumber,
        endColumn: insertPosition.column
      },
      text: newText
    }]);
    
    // Move cursor to the end of the new line
    editor.setPosition({
      lineNumber: insertPosition.lineNumber,
      column: newText.length
    });
    
    editor.focus();
  }, [editor, block]);
  
  /**
   * Edit an existing statement in the block
   */
  const editStatement = useCallback((index: number, text: string) => {
    if (!editor || !block || !block.statements) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const statement = block.statements[index];
    if (!statement) {
      console.warn('Statement not found at index', index);
      return;
    }
    
    // Use metadata line number (1-based in Monaco)
    // block.startLine is 0-based index of ```wod
    // statement.meta.line is 1-based index relative to block content
    const absoluteLine = block.startLine + 1 + statement.meta.line;
    
    // Validate range (1-based)
    // block.startLine + 1 is the line with ```wod (1-based)
    // block.endLine + 1 is the line with ``` (1-based)
    if (absoluteLine <= block.startLine + 1 || absoluteLine >= block.endLine + 1) {
      console.warn('Statement line out of range', { 
        absoluteLine, 
        startLine: block.startLine, 
        endLine: block.endLine,
        metaLine: statement.meta.line 
      });
      return;
    }
    
    const lineContent = model.getLineContent(absoluteLine);
    const lineLength = lineContent.length;
    
    // Preserve indentation
    const match = lineContent.match(/^(\s*)/);
    const indentation = match ? match[1] : '';
    
    // Replace the entire line
    editor.executeEdits('fragment-editor', [{
      range: {
        startLineNumber: absoluteLine,
        startColumn: 1,
        endLineNumber: absoluteLine,
        endColumn: lineLength + 1
      },
      text: `${indentation}${text}`
    }]);
    
    editor.focus();
  }, [editor, block]);
  
  /**
   * Delete a statement from the block
   */
  const deleteStatement = useCallback((index: number) => {
    if (!editor || !block || !block.statements) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const statement = block.statements[index];
    if (!statement) {
      console.warn('Statement not found at index', index);
      return;
    }
    
    // Use metadata line number
    // block.startLine is 0-based index of ```wod
    // statement.meta.line is 1-based index relative to block content
    const absoluteLine = block.startLine + 1 + statement.meta.line;
    
    if (absoluteLine <= block.startLine + 1 || absoluteLine >= block.endLine + 1) {
      console.warn('Statement line out of range', { 
        absoluteLine, 
        startLine: block.startLine, 
        endLine: block.endLine,
        metaLine: statement.meta.line 
      });
      return;
    }
    
    // Delete the entire line including newline
    editor.executeEdits('fragment-editor', [{
      range: {
        startLineNumber: absoluteLine,
        startColumn: 1,
        endLineNumber: absoluteLine + 1,
        endColumn: 1
      },
      text: ''
    }]);
    
    editor.focus();
  }, [editor, block]);
  
  return {
    addStatement,
    editStatement,
    deleteStatement
  };
}
