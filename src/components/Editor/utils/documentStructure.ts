import { ScriptBlock } from '../types';

export type DocumentItemType = 'wod' | 'header' | 'paragraph';

export interface DocumentItem {
  id: string;
  type: DocumentItemType;
  content: string;
  startLine: number;
  endLine: number;
  level?: number; // For headers
  scriptBlock?: ScriptBlock; // If type is 'wod'
}

/**
 * Parses the document content and combines it with detected WOD blocks
 * to create a linear structure of the document.
 */
export function parseDocumentStructure(content: string, scriptBlocks: ScriptBlock[]): DocumentItem[] {
  const lines = content.split('\n');
  const items: DocumentItem[] = [];
  
  let currentLine = 0;
  
  while (currentLine < lines.length) {
    // Check if current line is start of a WOD block
    const scriptBlock = scriptBlocks.find(b => b.startLine === currentLine);
    
    if (scriptBlock) {
      items.push({
        id: scriptBlock.id,
        type: 'wod',
        content: scriptBlock.content,
        startLine: scriptBlock.startLine,
        endLine: scriptBlock.endLine,
        scriptBlock: scriptBlock
      });
      currentLine = scriptBlock.endLine + 1;
      continue;
    }
    
    const lineContent = lines[currentLine];
    const trimmedLine = lineContent.trim();
    
    if (trimmedLine === '') {
      currentLine++;
      continue;
    }
    
    // Check for headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      items.push({
        id: `header-${currentLine}`,
        type: 'header',
        content: headerMatch[2],
        startLine: currentLine,
        endLine: currentLine,
        level: headerMatch[1].length
      });
      currentLine++;
      continue;
    }
    
    // Paragraph (group consecutive non-empty, non-header, non-wod lines)
    let paragraphEndLine = currentLine;
    let paragraphContent = [lineContent];
    
    let nextLine = currentLine + 1;
    while (nextLine < lines.length) {
      // Stop if next line is start of WOD block
      if (scriptBlocks.some(b => b.startLine === nextLine)) break;
      
      const nextLineContent = lines[nextLine];
      const nextTrimmed = nextLineContent.trim();
      
      // Stop if empty line (paragraph break)
      if (nextTrimmed === '') break;
      
      // Stop if header
      if (nextTrimmed.match(/^(#{1,6})\s+(.+)$/)) break;
      
      paragraphContent.push(nextLineContent);
      paragraphEndLine = nextLine;
      nextLine++;
    }
    
    items.push({
      id: `paragraph-${currentLine}`,
      type: 'paragraph',
      content: paragraphContent.join('\n'),
      startLine: currentLine,
      endLine: paragraphEndLine
    });
    
    currentLine = paragraphEndLine + 1;
  }
  
  return items;
}
