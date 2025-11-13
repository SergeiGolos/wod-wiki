/**
 * ContextOverlay - Overlay widget displaying context panel for active WOD block
 */

import { editor as monacoEditor } from 'monaco-editor';
import { ReactMonacoWidget } from './ReactMonacoWidget';
import { ContextPanel, ContextPanelProps } from '../components/ContextPanel';
import { WodBlock } from '../types';

/**
 * Overlay widget that shows WOD block context on the right side of editor
 */
export class ContextOverlay extends ReactMonacoWidget<ContextPanelProps> 
  implements monacoEditor.IOverlayWidget {
  
  constructor(
    editor: monacoEditor.IStandaloneCodeEditor,
    private block: WodBlock
  ) {
    super(editor, `context-overlay-${block.id}`);
    
    // Style the widget container
    this.domNode.style.position = 'absolute';
    this.domNode.style.width = '400px';
    this.domNode.style.height = '100%';
    this.domNode.style.zIndex = '10';
    this.domNode.style.pointerEvents = 'auto';
    
    // Initial render
    this.update(block);
  }
  
  /**
   * Update the overlay with new block data
   */
  update(block: WodBlock): void {
    this.block = block;
    this.renderComponent(ContextPanel, {
      block: this.block,
      compact: false
    });
  }
  
  /**
   * Get the position of the overlay widget
   */
  getPosition(): monacoEditor.IOverlayWidgetPosition {
    const layout = this.editor.getLayoutInfo();
    const lineTop = this.editor.getTopForLineNumber(this.block.startLine + 1); // Monaco is 1-indexed
    
    return {
      preference: {
        top: Math.max(0, lineTop),
        left: layout.width / 2  // Position on right half
      }
    };
  }
  
  /**
   * Allow the widget to overflow the editor
   */
  get allowEditorOverflow(): boolean {
    return false;
  }
}
