import { Range, editor } from 'monaco-editor';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';

export class BlockquoteFeature implements RichFeature {
    id = 'blockquote';
    debugName = 'Blockquote Syntax Hiding';

    parse(context: RichFeatureContext): FeatureRange[] {
        const lines = context.model.getLinesContent();
        const ranges: FeatureRange[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];
            const lineNum = i + 1;
            
            // Matches > Quote
            const quoteMatch = lineContent.match(/^>\s+(.*)/);
            if (quoteMatch) {
                ranges.push({
                    range: new Range(lineNum, 1, lineNum, lineContent.length + 1),
                    metadata: {
                        fullMatch: quoteMatch[0],
                        text: quoteMatch[1]
                    }
                });
            }
        }
        return ranges;
    }

    shouldHide(_range: FeatureRange, _context: RichFeatureContext): boolean {
        return false;
    }

    getDecorations(range: FeatureRange, context: RichFeatureContext): editor.IModelDeltaDecoration[] {
        if (context.isReadOnly) return [];

        const currentLine = context.cursorPosition?.lineNumber || -1;
        const line = range.range.startLineNumber;
        
        // If cursor is on the line, don't hide syntax
        if (currentLine === line) return [];

        const { fullMatch, text } = range.metadata;
        const prefixLength = fullMatch.length - text.length;

        return [
            {
                range: new Range(line, 1, line, 1 + prefixLength),
                options: { inlineClassName: 'rich-md-hidden' }
            },
            {
                range: new Range(line, 1, line, range.range.endColumn),
                options: { 
                    isWholeLine: true,
                    className: 'rich-md-blockquote'
                }
            }
        ];
    }
}
