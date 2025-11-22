import { Range, editor } from 'monaco-editor';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';

export class HeadingFeature implements RichFeature {
    id = 'heading';
    debugName = 'Heading Syntax Hiding';

    parse(context: RichFeatureContext): FeatureRange[] {
        const lines = context.model.getLinesContent();
        const ranges: FeatureRange[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];
            const lineNum = i + 1;
            
            // Matches # Heading, ## Heading, ### Heading
            const headingMatch = lineContent.match(/^(\s*)(#{1,3})\s+(.*)/);
            if (headingMatch) {
                ranges.push({
                    range: new Range(lineNum, 1, lineNum, lineContent.length + 1),
                    metadata: {
                        fullMatch: headingMatch[0],
                        text: headingMatch[3],
                        level: headingMatch[2].length
                    }
                });
            }
        }
        return ranges;
    }

    shouldHide(_range: FeatureRange, _context: RichFeatureContext): boolean {
        // We never "hide" the line via setHiddenAreas, so return false.
        // We only use decorations.
        return false;
    }

    getDecorations(range: FeatureRange, context: RichFeatureContext): editor.IModelDeltaDecoration[] {
        if (context.isReadOnly) return [];

        const currentLine = context.cursorPosition?.lineNumber || -1;
        const line = range.range.startLineNumber;
        
        // If cursor is on the line, don't hide syntax
        if (currentLine === line) return [];

        const { fullMatch, text, level } = range.metadata;
        const prefixLength = fullMatch.length - text.length;

        return [
            {
                range: new Range(line, 1, line, 1 + prefixLength),
                options: { inlineClassName: 'rich-md-hidden' }
            },
            {
                range: new Range(line, 1 + prefixLength, line, range.range.endColumn),
                options: { inlineClassName: `rich-md-heading-${level}` }
            }
        ];
    }
}
