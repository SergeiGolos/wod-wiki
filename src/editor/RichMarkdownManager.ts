import { editor, Range } from 'monaco-editor';
import { FrontMatterParser } from './frontmatter/FrontMatterParser';
import { FrontMatterTable } from './frontmatter/FrontMatterTable';
import { MediaParser } from './media/MediaParser';
import { MediaWidget } from './media/MediaWidget';
import React from 'react';
import ReactDOM from 'react-dom/client';

export class RichMarkdownManager {
    private editor: editor.IStandaloneCodeEditor;
    private decorations: string[] = [];
    private viewZones: string[] = [];
    private zoneRoots: Map<string, ReactDOM.Root> = new Map();
    private zoneResizeObservers: Map<string, ResizeObserver> = new Map();
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
        this.clearViewZones();
    }

    private clearDecorations() {
        if (this.decorations.length > 0) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
            this.decorations = [];
        }
    }

    private clearViewZones() {
        this.editor.changeViewZones((changeAccessor) => {
            this.viewZones.forEach(id => {
                changeAccessor.removeZone(id);
                const root = this.zoneRoots.get(id);
                if (root) {
                    root.unmount();
                    this.zoneRoots.delete(id);
                }
                const observer = this.zoneResizeObservers.get(id);
                if (observer) {
                    observer.disconnect();
                    this.zoneResizeObservers.delete(id);
                }
            });
        });
        this.viewZones = [];
    }

    private updateDecorations() {
        if (this.isDisposed) return;

        const model = this.editor.getModel();
        if (!model) return;

        const cursorPosition = this.editor.getPosition();
        const currentLine = cursorPosition?.lineNumber || -1;

        const newDecorations: editor.IModelDeltaDecoration[] = [];
        const lineCount = model.getLineCount();
        const lines = model.getLinesContent();

        // Parse Front Matter
        const frontMatterBlocks = FrontMatterParser.parse(lines);
        // Parse Media
        const mediaBlocks = MediaParser.parse(lines);

        const hiddenAreas: Range[] = [];
        
        // Handle View Zones for Front Matter & Media
        this.editor.changeViewZones((changeAccessor) => {
            // Clear existing zones first (simple approach for now, can be optimized)
            this.viewZones.forEach(id => {
                changeAccessor.removeZone(id);
                const root = this.zoneRoots.get(id);
                if (root) {
                    root.unmount();
                    this.zoneRoots.delete(id);
                }
                const observer = this.zoneResizeObservers.get(id);
                if (observer) {
                    observer.disconnect();
                    this.zoneResizeObservers.delete(id);
                }
            });
            this.viewZones = [];

            // Front Matter Logic
            frontMatterBlocks.forEach(block => {
                const isCursorInside = currentLine >= block.startLine && currentLine <= block.endLine;
                
                if (!isCursorInside) {
                    // Mark for hiding (using setHiddenAreas instead of decorations)
                    hiddenAreas.push(new Range(block.startLine, 1, block.endLine, 1));

                    // Create View Zone
                    const domNode = document.createElement('div');
                    const root = ReactDOM.createRoot(domNode);
                    
                    const handleEdit = () => {
                        (this.editor as any).setHiddenAreas([]); 
                        this.editor.setPosition({ lineNumber: block.startLine, column: 1 });
                        this.editor.revealLine(block.startLine);
                        this.editor.focus();
                    };

                    root.render(React.createElement(FrontMatterTable, { 
                        properties: block.properties,
                        onEdit: handleEdit
                    }));

                    const viewZoneId = changeAccessor.addZone({
                        afterLineNumber: block.startLine - 1, 
                        heightInLines: Object.keys(block.properties).length + 2, 
                        domNode: domNode
                    });
                    this.viewZones.push(viewZoneId);
                    this.zoneRoots.set(viewZoneId, root);
                }
            });

            // Media Logic
            mediaBlocks.forEach(block => {
                if (block.isWholeLine) {
                    const isCursorOnLine = currentLine === block.line;
                    if (!isCursorOnLine) {
                        // Hide line
                        hiddenAreas.push(new Range(block.line, 1, block.line, 1));
                        
                        // Create View Zone
                        const domNode = document.createElement('div');
                        const root = ReactDOM.createRoot(domNode);
                        
                        const handleEdit = () => {
                            (this.editor as any).setHiddenAreas([]); 
                            this.editor.setPosition({ lineNumber: block.line, column: 1 });
                            this.editor.revealLine(block.line);
                            this.editor.focus();
                        };

                        root.render(React.createElement(MediaWidget, { 
                            type: block.type, 
                            url: block.url, 
                            alt: block.alt,
                            onEdit: handleEdit
                        }));

                        const viewZoneId = changeAccessor.addZone({
                            afterLineNumber: block.line - 1,
                            heightInLines: block.type === 'youtube' ? 15 : 10, 
                            domNode: domNode
                        });
                        this.viewZones.push(viewZoneId);
                        this.zoneRoots.set(viewZoneId, root);

                        // Add ResizeObserver
                        const observer = new ResizeObserver(() => {
                            this.editor.changeViewZones(accessor => {
                                accessor.layoutZone(viewZoneId);
                            });
                        });
                        observer.observe(domNode);
                        this.zoneResizeObservers.set(viewZoneId, observer);
                    }
                }
            });
        });

        // Apply hidden areas
        // This replaces the 'rich-md-hidden-line' decoration for Front Matter
        // (this.editor as any).setHiddenAreas(hiddenAreas); // Moved to end

        console.log(`[RichMarkdown] Updating decorations. Current line: ${currentLine}`);

        for (let i = 1; i <= lineCount; i++) {
            const lineContent = model.getLineContent(i);
            const isCurrentLine = i === currentLine;

            // 1. Headings
            // Matches # Heading, ## Heading, ### Heading
            const headingMatch = lineContent.match(/^(\s*)(#{1,3})\s+(.*)/);
            if (headingMatch) {
                // const leadingSpace = headingMatch[1];
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
                    // Use setHiddenAreas to completely collapse the line
                    hiddenAreas.push(new Range(i, 1, i, 1));
                }
            }
        }
        
        // Apply hidden areas (Front Matter + WOD Fences)
        (this.editor as any).setHiddenAreas(hiddenAreas);
        
        if (newDecorations.length > 0) {
             console.log(`[RichMarkdown] Applying ${newDecorations.length} decorations`);
        }

        this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
    }
}
