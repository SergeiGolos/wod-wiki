import { editor, Range } from 'monaco-editor';

export class RichMarkdownManager {
    private editor: editor.IStandaloneCodeEditor;
    private decorations: string[] = [];
    private isDisposed = false;

    constructor(editor: editor.IStandaloneCodeEditor) {
        this.editor = editor;
        // Listen to cursor changes to toggle visibility
        this.editor.onDidChangeCursorPosition(() => this.updateDecorations());
        // Listen to content changes to update ranges
        this.editor.onDidChangeModelContent(() => this.updateDecorations());
        
        // Initial update
        this.updateDecorations();
    }

    public dispose() {
        this.isDisposed = true;
        this.clearDecorations();
    }

    private clearDecorations() {
        if (this.decorations.length > 0) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
            this.decorations = [];
        }
    }

    private updateDecorations() {
        if (this.isDisposed) return;

        const model = this.editor.getModel();
        if (!model) return;

        const cursorPosition = this.editor.getPosition();
        const currentLine = cursorPosition?.lineNumber || -1;

        const newDecorations: editor.IModelDeltaDecoration[] = [];
        const lineCount = model.getLineCount();

        console.log(`[RichMarkdown] Updating decorations. Current line: ${currentLine}`);

        for (let i = 1; i <= lineCount; i++) {
            const lineContent = model.getLineContent(i);
            const isCurrentLine = i === currentLine;

            // 1. Headings
            // Matches # Heading, ## Heading, ### Heading
            const headingMatch = lineContent.match(/^(\s*)(#{1,3})\s+(.*)/);
            if (headingMatch) {
                const leadingSpace = headingMatch[1];
                const hashes = headingMatch[2];
                const text = headingMatch[3];
                const level = hashes.length;
                
                // Range of the hashes + space: 
                // Start: 1 + leadingSpace.length
                // End: 1 + leadingSpace.length + hashes.length + (whitespace after hashes)
                // Re-calculating exact range for the "hidden" part
                const fullMatch = headingMatch[0];
                const prefixLength = fullMatch.length - text.length; 
                
                if (!isCurrentLine) {
                    console.log(`[RichMarkdown] Hiding heading on line ${i}`);
                    newDecorations.push({
                        range: new Range(i, 1, i, 1 + prefixLength),
                        options: { inlineClassName: 'rich-md-hidden' }
                    });

                    // Style the text
                    newDecorations.push({
                        range: new Range(i, 1 + prefixLength, i, lineContent.length + 1),
                        options: { inlineClassName: `rich-md-heading-${level}` }
                    });
                }
            }

            // 2. Blockquotes
            // Matches > Quote
            const quoteMatch = lineContent.match(/^>\s+(.*)/);
            if (quoteMatch) {
                if (!isCurrentLine) {
                    const fullMatch = quoteMatch[0];
                    const text = quoteMatch[1];
                    const prefixLength = fullMatch.length - text.length;

                    // Hide the "> "
                    newDecorations.push({
                        range: new Range(i, 1, i, 1 + prefixLength),
                        options: { inlineClassName: 'rich-md-hidden' }
                    });

                    // Apply block style to the whole line
                    newDecorations.push({
                        range: new Range(i, 1, i, lineContent.length + 1),
                        options: { 
                            isWholeLine: true,
                            className: 'rich-md-blockquote' 
                        }
                    });
                }
            }

            // 3. WOD Blocks
            // Matches ```wod or ```
            const trimmed = lineContent.trim();
            if (trimmed === '```wod' || trimmed === '```') {
                if (!isCurrentLine) {
                    console.log(`[RichMarkdown] Hiding WOD block fence on line ${i}`);
                    newDecorations.push({
                        range: new Range(i, 1, i, lineContent.length + 1),
                        options: { inlineClassName: 'rich-md-hidden-line' }
                    });
                }
            }
        }
        
        if (newDecorations.length > 0) {
             console.log(`[RichMarkdown] Applying ${newDecorations.length} decorations`);
        }

        this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
    }
}
