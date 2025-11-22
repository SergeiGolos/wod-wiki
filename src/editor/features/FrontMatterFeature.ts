import { Range } from 'monaco-editor';
import React from 'react';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';
import { FrontMatterParser } from '../frontmatter/FrontMatterParser';
import { FrontMatterTable } from '../frontmatter/FrontMatterTable';

export class FrontMatterFeature implements RichFeature {
    id = 'frontmatter';
    debugName = 'Front Matter Folding';

    parse(context: RichFeatureContext): FeatureRange[] {
        const lines = context.model.getLinesContent();
        const blocks = FrontMatterParser.parse(lines);
        
        return blocks.map(block => ({
            range: new Range(block.startLine, 1, block.endLine, 1),
            metadata: block
        }));
    }

    shouldHide(range: FeatureRange, context: RichFeatureContext): boolean {
        if (context.isReadOnly) return true;
        
        const currentLine = context.cursorPosition?.lineNumber || -1;
        const start = range.range.startLineNumber;
        const end = range.range.endLineNumber;
        
        // If cursor is inside the block, don't hide
        const isCursorInside = currentLine >= start && currentLine <= end;
        return !isCursorInside;
    }

    renderWidget(range: FeatureRange, onEdit: () => void): React.ReactNode {
        return React.createElement(FrontMatterTable, {
            properties: range.metadata.properties,
            onEdit: onEdit
        });
    }
}
