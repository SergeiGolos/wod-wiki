import { Range } from 'monaco-editor';
import React from 'react';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';
import { MediaParser } from '../media/MediaParser';
import { MediaWidget } from '../media/MediaWidget';

export class MediaFeature implements RichFeature {
    id = 'media';
    debugName = 'Media Folding';

    parse(context: RichFeatureContext): FeatureRange[] {
        const lines = context.model.getLinesContent();
        const blocks = MediaParser.parse(lines);
        
        return blocks.map(block => ({
            range: new Range(block.line, 1, block.line, 1),
            metadata: block
        }));
    }

    shouldHide(range: FeatureRange, context: RichFeatureContext): boolean {
        if (context.isReadOnly) return true;
        
        const currentLine = context.cursorPosition?.lineNumber || -1;
        const line = range.range.startLineNumber;
        
        // If cursor is on the line, don't hide
        return currentLine !== line;
    }

    renderWidget(range: FeatureRange, onEdit: () => void): React.ReactNode {
        const block = range.metadata;
        return React.createElement(MediaWidget, {
            type: block.type,
            url: block.url,
            alt: block.alt,
            onEdit: onEdit
        });
    }
}
