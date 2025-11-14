/**
 * WodBlockHeaderWidget - Monaco content widget for displaying WOD block headers
 */

import { editor as monacoEditor } from 'monaco-editor';
import { ReactMonacoWidget } from './ReactMonacoWidget';
import { WodBlockHeader, WodBlockHeaderProps } from '../components/WodBlockHeader';
import { WodBlock } from '../types';

/**
 * Monaco content widget that displays a header above WOD blocks
 */
export class WodBlockHeaderWidget extends ReactMonacoWidget<WodBlockHeaderProps> 
  implements monacoEditor.IContentWidget {
  
  private block: WodBlock;
  private index: number;
  private onRecord?: () => void;
  private onTrack?: () => void;
  private isActive: boolean;
  
  constructor(
    editor: monacoEditor.IStandaloneCodeEditor,
    block: WodBlock,
    index: number,
    isActive: boolean = false,
    callbacks?: {
      onRecord?: () => void;
      onTrack?: () => void;
    }
  ) {
    super(editor, `wod-header-${block.id}`);
    
    this.block = block;
    this.index = index;
    this.isActive = isActive;
    this.onRecord = callbacks?.onRecord;
    this.onTrack = callbacks?.onTrack;
    
    // Style the widget container
    this.domNode.style.zIndex = '5';
    this.domNode.style.marginTop = '0px';
    this.domNode.style.marginLeft = '0px';
    
    // Initial render
    this.update(block, index, isActive, callbacks);
  }
  
  /**
   * Update the widget with new block data
   */
  update(
    block: WodBlock,
    index: number,
    isActive: boolean = false,
    callbacks?: {
      onRecord?: () => void;
      onTrack?: () => void;
    }
  ): void {
    this.block = block;
    this.index = index;
    this.isActive = isActive;
    
    if (callbacks) {
      this.onRecord = callbacks.onRecord;
      this.onTrack = callbacks.onTrack;
    }
    
    this.renderComponent(WodBlockHeader, {
      label: this.block.label,
      index: this.index,
      isActive: this.isActive,
      onRecord: this.onRecord,
      onTrack: this.onTrack
    });
  }
  
  /**
   * Get the position where the widget should be displayed
   * Position it at the line before the WOD block starts
   */
  getPosition(): monacoEditor.IContentWidgetPosition | null {
    return {
      position: {
        lineNumber: this.block.startLine + 1, // Monaco is 1-indexed
        column: 1
      },
      preference: [monacoEditor.ContentWidgetPositionPreference.ABOVE]
    };
  }
}
