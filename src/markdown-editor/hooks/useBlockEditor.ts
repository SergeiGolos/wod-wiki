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
    const insertLine = block.endLine; // Line with closing ```
    const lineContent = model.getLineContent(insertLine);
    
    // Find the last non-empty line before closing ```
    let lastContentLine = insertLine - 1;
    while (lastContentLine > block.startLine) {
      const content = model.getLineContent(lastContentLine);
      if (content.trim()) break;
      lastContentLine--;
    }
    
    // Insert new line after last content
    const insertPosition = {
      lineNumber: lastContentLine + 1,
      column: 1
    };
    
    // Format the new line with proper indentation
    const newText = `${text}\n`;
    
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
    if (!editor || !block) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Find the line number for this statement
    // Statements start at block.startLine + 1 (after opening ```)
    const statementLine = block.startLine + 1 + index;
    
    if (statementLine >= block.endLine) {
      console.warn('Statement index out of range');
      return;
    }
    
    const lineContent = model.getLineContent(statementLine);
    const lineLength = lineContent.length;
    
    // Replace the entire line
    editor.executeEdits('fragment-editor', [{
      range: {
        startLineNumber: statementLine,
        startColumn: 1,
        endLineNumber: statementLine,
        endColumn: lineLength + 1
      },
      text: text
    }]);
    
    editor.focus();
  }, [editor, block]);
  
  /**
   * Delete a statement from the block
   */
  const deleteStatement = useCallback((index: number) => {
    if (!editor || !block) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Find the line number for this statement
    const statementLine = block.startLine + 1 + index;
    
    if (statementLine >= block.endLine) {
      console.warn('Statement index out of range');
      return;
    }
    
    // Delete the entire line including newline
    editor.executeEdits('fragment-editor', [{
      range: {
        startLineNumber: statementLine,
        startColumn: 1,
        endLineNumber: statementLine + 1,
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
