import { editor, Range } from 'monaco-editor';
import ReactDOM from 'react-dom/client';
import { RichFeature, RichFeatureContext, FeatureRange } from './RichFeature';

export class FeatureRegistry {
    private features: RichFeature[] = [];
    private editor: editor.IStandaloneCodeEditor;
    
    // State tracking
    private decorations: string[] = [];
    private viewZones: string[] = [];
    private zoneRoots: Map<string, ReactDOM.Root> = new Map();
    private zoneResizeObservers: Map<string, ResizeObserver> = new Map();
    
    private lastViewZoneState: string = '';
    private lastHiddenAreasState: string = '';

    constructor(editor: editor.IStandaloneCodeEditor) {
        this.editor = editor;
    }

    public register(feature: RichFeature) {
        this.features.push(feature);
        console.log(`[FeatureRegistry] Registered feature: ${feature.debugName}`);
    }

    public dispose() {
        this.clearDecorations();
        this.clearViewZones();
        this.features = [];
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
                this.cleanupZone(id);
            });
        });
        this.viewZones = [];
    }

    private cleanupZone(id: string) {
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
    }

    public update() {
        const model = this.editor.getModel();
        if (!model) return;

        const context: RichFeatureContext = {
            model,
            isReadOnly: this.editor.getOption(editor.EditorOption.readOnly),
            cursorPosition: this.editor.getPosition()
        };

        const hiddenAreas: Range[] = [];
        const viewZonesToRender: { feature: RichFeature, range: FeatureRange, id: string }[] = [];
        const newDecorations: editor.IModelDeltaDecoration[] = [];

        // Process all features
        for (const feature of this.features) {
            try {
                const ranges = feature.parse(context);
                
                for (const range of ranges) {
                    // Check if should hide
                    if (feature.shouldHide(range, context)) {
                        // Add to hidden areas if it's a block/line hiding feature
                        // (Inline hiding is handled via decorations)
                        // We assume if renderWidget is present OR it's a whole line range, we use setHiddenAreas
                        // But some features might just want inline decorations.
                        // Let's rely on the feature to tell us? 
                        // For now, if it has a widget, we definitely hide.
                        // If it doesn't have a widget, we check if it's a whole line range?
                        // Actually, let's assume if shouldHide is true, we put it in hiddenAreas UNLESS it's inline.
                        // But we don't know if it's inline easily.
                        // Let's look at the range. If startLine != endLine or startCol=1/endCol=max, it's likely block.
                        // Better: If the feature provides getDecorations, it might be handling hiding itself (like headings).
                        // But Headings return FALSE for shouldHide in our plan.
                        
                        if (feature.renderWidget) {
                            hiddenAreas.push(range.range);
                            const id = `${feature.id}:${range.range.startLineNumber}-${range.range.endLineNumber}`;
                            viewZonesToRender.push({ feature, range, id });
                        } else {
                            // Just hide, no widget (like WOD blocks)
                            // Only if it's a full line/block hide.
                            // We'll assume shouldHide=true implies setHiddenAreas usage.
                            hiddenAreas.push(range.range);
                        }
                    }

                    // Get decorations
                    if (feature.getDecorations) {
                        const featureDecorations = feature.getDecorations(range, context);
                        newDecorations.push(...featureDecorations);
                    }
                }
            } catch (e) {
                console.error(`[FeatureRegistry] Error in feature ${feature.debugName}:`, e);
            }
        }

        // --- Update View Zones ---
        const newViewZoneState = viewZonesToRender.map(z => z.id).join('|');
        if (newViewZoneState !== this.lastViewZoneState) {
            // console.log(`[FeatureRegistry] ViewZone state changed.`);
            this.lastViewZoneState = newViewZoneState;

            this.editor.changeViewZones((changeAccessor) => {
                // 1. Remove old zones
                this.viewZones.forEach(id => {
                    changeAccessor.removeZone(id);
                    this.cleanupZone(id);
                });
                this.viewZones = [];

                // 2. Add new zones
                viewZonesToRender.forEach(item => {
                    if (!item.feature.renderWidget) return;

                    const domNode = document.createElement('div');
                    const root = ReactDOM.createRoot(domNode);

                    const handleEdit = () => {
                        // Unhide everything temporarily or just this?
                        // The original logic unhid everything. Let's stick to that for simplicity or try to be smarter.
                        // Actually, unhiding everything is safest to ensure cursor can jump there.
                        (this.editor as any).setHiddenAreas([]);
                        this.editor.setPosition({ lineNumber: item.range.range.startLineNumber, column: 1 });
                        this.editor.revealLine(item.range.range.startLineNumber);
                        this.editor.focus();
                    };

                    const component = item.feature.renderWidget(item.range, handleEdit);
                    root.render(component);

                    // Calculate height
                    // We might need the feature to tell us the height?
                    // For now, let's hardcode or ask feature?
                    // The original logic had specific heights.
                    // Let's add `getHeight` to interface or infer?
                    // We can try to infer from the component type or add a method.
                    // Let's add a helper or check metadata.
                    // For now, I'll add a hack or update interface in next step if needed.
                    // Wait, the original logic had:
                    // FrontMatter: keys.length + 2
                    // Media: 15 or 10
                    // I should probably add `getHeightInLines` to the interface.
                    
                    let heightInLines = 10; // Default
                    if (item.feature.id === 'frontmatter') {
                         heightInLines = Object.keys(item.range.metadata?.properties || {}).length + 2;
                    } else if (item.feature.id === 'media') {
                        heightInLines = item.range.metadata?.type === 'youtube' ? 15 : 10;
                    }

                    const viewZoneId = changeAccessor.addZone({
                        afterLineNumber: item.range.range.startLineNumber - 1,
                        heightInLines,
                        domNode
                    });
                    
                    this.viewZones.push(viewZoneId);
                    this.zoneRoots.set(viewZoneId, root);

                    // Resize observer for media?
                    if (item.feature.id === 'media') {
                        const observer = new ResizeObserver(() => {
                            this.editor.changeViewZones(accessor => {
                                accessor.layoutZone(viewZoneId);
                            });
                        });
                        observer.observe(domNode);
                        this.zoneResizeObservers.set(viewZoneId, observer);
                    }
                });
            });
        }

        // --- Update Hidden Areas ---
        hiddenAreas.sort((a, b) => a.startLineNumber - b.startLineNumber);
        const newHiddenAreasState = hiddenAreas.map(r => `${r.startLineNumber}-${r.endLineNumber}`).join('|');
        
        if (newHiddenAreasState !== this.lastHiddenAreasState) {
            // console.log(`[FeatureRegistry] HiddenAreas state changed.`);
            this.lastHiddenAreasState = newHiddenAreasState;
            (this.editor as any).setHiddenAreas(hiddenAreas);
        }

        // --- Update Decorations ---
        this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
    }
}
