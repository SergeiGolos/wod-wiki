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
    
    // Style the widget container for right-side positioning
    this.domNode.style.position = 'fixed';
    this.domNode.style.right = '0';
    this.domNode.style.top = '0';
    this.domNode.style.width = '400px';
    this.domNode.style.height = '100%';
    this.domNode.style.zIndex = '1000';
    this.domNode.style.pointerEvents = 'auto';
    this.domNode.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
    
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
   * Return null to use custom CSS positioning
   */
  getPosition(): monacoEditor.IOverlayWidgetPosition | null {
    return null;
  }
}
