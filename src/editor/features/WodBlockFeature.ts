import { Range } from 'monaco-editor';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';

export class WodBlockFeature implements RichFeature {
    id = 'wod-block';
    debugName = 'WOD Block Folding';

    parse(context: RichFeatureContext): FeatureRange[] {
        const lines = context.model.getLinesContent();
        const ranges: FeatureRange[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];
            const trimmed = lineContent.trim();
            const lineNum = i + 1;

            if (trimmed === '```wod' || trimmed === '```') {
                ranges.push({
                    range: new Range(lineNum, 1, lineNum, 1)
                });
            }
        }
        return ranges;
    }

    shouldHide(range: FeatureRange, context: RichFeatureContext): boolean {
        if (context.isReadOnly) return true;
        
        const currentLine = context.cursorPosition?.lineNumber || -1;
        const line = range.range.startLineNumber;
        
        // If cursor is on the line, don't hide
        return currentLine !== line;
    }
}
