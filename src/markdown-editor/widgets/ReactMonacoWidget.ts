/**
 * Base class for Monaco widgets that render React components
 * Handles React root lifecycle and proper cleanup
 */

import { createRoot, Root } from 'react-dom/client';
import { editor as monacoEditor } from 'monaco-editor';
import React from 'react';

/**
 * Abstract base class for Monaco widgets with React integration
 */
export abstract class ReactMonacoWidget<P = any> {
  protected domNode: HTMLElement;
  protected reactRoot: Root | null = null;
  protected currentProps: P | null = null;
  
  constructor(
    protected editor: monacoEditor.IStandaloneCodeEditor,
    protected id: string
  ) {
    this.domNode = document.createElement('div');
    this.domNode.className = 'monaco-react-widget';
  }
  
  /**
   * Render React component with given props
   */
  protected renderComponent(Component: React.ComponentType<P>, props: P): void {
    if (!this.reactRoot) {
      this.reactRoot = createRoot(this.domNode);
    }
    this.currentProps = props;
    this.reactRoot.render(React.createElement(Component, props));
  }
  
  /**
   * Update props without recreating root
   * Only re-renders if props actually changed
   */
  protected updateProps(Component: React.ComponentType<P>, props: P): void {
    if (this.reactRoot && this.currentProps) {
      // Only re-render if props actually changed
      if (JSON.stringify(props) !== JSON.stringify(this.currentProps)) {
        this.renderComponent(Component, props);
      }
    } else {
      this.renderComponent(Component, props);
    }
  }
  
  /**
   * Clean up React root and DOM
   */
  dispose(): void {
    if (this.reactRoot) {
      // Defer unmount to avoid race condition with React rendering
      const root = this.reactRoot;
      this.reactRoot = null;
      setTimeout(() => {
        root.unmount();
      }, 0);
    }
    // Remove from DOM if still attached
    if (this.domNode.parentNode) {
      this.domNode.parentNode.removeChild(this.domNode);
    }
  }
  
  getId(): string {
    return this.id;
  }
  
  getDomNode(): HTMLElement {
    return this.domNode;
  }
}
