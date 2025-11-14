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
  
  private onAddStatement?: (text: string) => void;
  private onEditStatement?: (index: number, text: string) => void;
  private onDeleteStatement?: (index: number) => void;
  
  constructor(
    editor: monacoEditor.IStandaloneCodeEditor,
    private block: WodBlock,
    callbacks?: {
      onAddStatement?: (text: string) => void;
      onEditStatement?: (index: number, text: string) => void;
      onDeleteStatement?: (index: number) => void;
    }
  ) {
    super(editor, `context-overlay-${block.id}`);
    
    // Store callbacks
    this.onAddStatement = callbacks?.onAddStatement;
    this.onEditStatement = callbacks?.onEditStatement;
    this.onDeleteStatement = callbacks?.onDeleteStatement;
    
    // Style the widget container for right-side positioning
    this.domNode.style.position = 'fixed';
    this.domNode.style.right = '0';
    this.domNode.style.top = '0';
    this.domNode.style.width = '400px';
    this.domNode.style.height = '100%';
    this.domNode.style.zIndex = '10000';
    this.domNode.style.pointerEvents = 'auto';
    this.domNode.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
    this.domNode.style.backgroundColor = '#ffffff';
    this.domNode.style.overflow = 'auto';
    
    // Append directly to body for proper fixed positioning
    // Monaco's overlayWidgets container has positioning constraints
    document.body.appendChild(this.domNode);I. Hey Google. What kind of long sleep insurance do you want? All right, now we're going. It's from Veteran Display. What kind of long sleeve shirts do you want? The real one. It's from Zeb's room speaker. Who are you talking to? Hey, Google broadcast. You alright? You. Hey, Cortana. Where does like, not doing my voice some of the time. It's like I'm not saying. Message coming from bedrooms. Broadcast from Zeb's room speaker don't really care. A Google broadcast. What's the message? Roger that. Alright. Do that. OK. Hey, Cortana, close the wall. In Sandy, **** **** it doesn't sound like a running song. It sounds good. What? It sounds good? What? 
    
    // Initial render
    this.update(block);
  }
  
  /**
   * Update the overlay with new block data and callbacks
   */
  update(
    block: WodBlock,
    callbacks?: {
      onAddStatement?: (text: string) => void;
      onEditStatement?: (index: number, text: string) => void;
      onDeleteStatement?: (index: number) => void;
    }
  ): void {
    this.block = block;
    
    // Update callbacks if provided
    if (callbacks) {
      this.onAddStatement = callbacks.onAddStatement;
      this.onEditStatement = callbacks.onEditStatement;
      this.onDeleteStatement = callbacks.onDeleteStatement;
    }
    
    this.renderComponent(ContextPanel, {
      block: this.block,
      compact: false,
      showEditor: true,
      onAddStatement: this.onAddStatement,
      onEditStatement: this.onEditStatement,
      onDeleteStatement: this.onDeleteStatement
    });
  }
  
  /**
   * Get the position of the overlay widget
   * Use Monaco's TOP_RIGHT_CORNER preference and let CSS handle exact positioning
   */
  getPosition(): monacoEditor.IOverlayWidgetPosition | null {
    return {
      preference: monacoEditor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER
    };
  }
}
