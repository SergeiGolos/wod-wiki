import { editor, Range, Position } from 'monaco-editor';
import React from 'react';

export interface RichFeatureContext {
    model: editor.ITextModel;
    isReadOnly: boolean;
    cursorPosition: Position | null;
}

export interface FeatureRange {
    range: Range;
    metadata?: any;
}

export interface RichFeature {
    /**
     * Unique identifier for the feature
     */
    id: string;
    
    /**
     * Human readable name for debugging
     */
    debugName: string;
    
    /**
     * Parse content and return ranges of interest.
     * This is called whenever the model content changes.
     */
    parse(context: RichFeatureContext): FeatureRange[];
    
    /**
     * Determine if a specific range should be hidden/folded.
     * This is called whenever the cursor moves or content changes.
     */
    shouldHide(range: FeatureRange, context: RichFeatureContext): boolean;
    
    /**
     * Optional: Return a React node to render in place of the hidden content.
     * If undefined, no ViewZone is created (just hidden).
     */
    renderWidget?(range: FeatureRange, onEdit: () => void): React.ReactNode;
    
    /**
     * Optional: Return decorations (e.g. for inline hiding or styling).
     * These are applied in addition to any hiding/view zones.
     */
    getDecorations?(range: FeatureRange, context: RichFeatureContext): editor.IModelDeltaDecoration[];
}
