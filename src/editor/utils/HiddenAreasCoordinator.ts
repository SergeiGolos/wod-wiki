import type { editor, Range } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

/**
 * Coordinates hidden areas from multiple sources to prevent conflicts.
 * Monaco's setHiddenAreas is a global setting for the editor, so multiple features
 * trying to hide different areas need to coordinate.
 */
export class HiddenAreasCoordinator {
    private editor: editor.IStandaloneCodeEditor;
    private monaco: Monaco;
    private sources: Map<string, Range[]> = new Map();

    constructor(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
        this.editor = editor;
        this.monaco = monaco;
        console.log('[HiddenAreasCoordinator] Initialized');
    }

    /**
     * Update hidden areas for a specific source
     * @param sourceId Unique identifier for the feature (e.g., 'wod-blocks', 'frontmatter')
     * @param ranges Array of ranges to hide
     */
    public updateHiddenAreas(sourceId: string, ranges: Range[]): void {
        console.log(`[HiddenAreasCoordinator] updateHiddenAreas called for ${sourceId} with ${ranges.length} ranges`);
        // Check if ranges actually changed to avoid unnecessary updates
        const current = this.sources.get(sourceId);
        if (current && this.areRangesEqual(current, ranges)) {
            console.log(`[HiddenAreasCoordinator] Ranges for ${sourceId} unchanged, skipping`);
            return;
        }

        this.sources.set(sourceId, ranges);
        this.apply();
    }

    /**
     * Clear hidden areas for a specific source
     */
    public clearHiddenAreas(sourceId: string): void {
        if (!this.sources.has(sourceId)) return;
        
        this.sources.delete(sourceId);
        this.apply();
    }

    private apply(): void {
        const allRanges: Range[] = [];
        for (const ranges of this.sources.values()) {
            allRanges.push(...ranges);
        }
        
        // Sort ranges by start line number
        allRanges.sort((a, b) => a.startLineNumber - b.startLineNumber);
        
        console.log('[HiddenAreasCoordinator] Applying hidden areas:', allRanges.length, 'ranges from', this.sources.size, 'sources');
        (this.editor as any).setHiddenAreas(allRanges);
    }

    private areRangesEqual(a: Range[], b: Range[]): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            // Use monaco instance for Range comparison if available, otherwise fallback to property check
            if (this.monaco.Range.equalsRange(a[i], b[i])) continue;
            
            // Fallback manual check if equalsRange returns false (or if we want to be double sure)
            // Actually equalsRange is reliable. If it returns false, they are different.
            return false;
        }
        return true;
    }
}
