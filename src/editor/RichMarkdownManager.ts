import { editor } from 'monaco-editor';
import { FeatureRegistry } from './features/FeatureRegistry';
import { FrontMatterFeature } from './features/FrontMatterFeature';
import { MediaFeature } from './features/MediaFeature';
import { WodBlockFeature } from './features/WodBlockFeature';
import { HeadingFeature } from './features/HeadingFeature';
import { BlockquoteFeature } from './features/BlockquoteFeature';

export class RichMarkdownManager {
    private editor: editor.IStandaloneCodeEditor;
    private registry: FeatureRegistry;
    private isDisposed = false;

    constructor(editor: editor.IStandaloneCodeEditor) {
        this.editor = editor;
        this.registry = new FeatureRegistry(editor);

        // Register Features
        this.registry.register(new FrontMatterFeature());
        this.registry.register(new MediaFeature());
        this.registry.register(new WodBlockFeature());
        this.registry.register(new HeadingFeature());
        this.registry.register(new BlockquoteFeature());

        // Listen to cursor changes to toggle visibility
        this.editor.onDidChangeCursorPosition(() => this.update());
        // Listen to content changes to update ranges
        this.editor.onDidChangeModelContent(() => this.update());

        // Initial update
        this.update();
    }

    public dispose() {
        this.isDisposed = true;
        this.registry.dispose();
    }

    private update() {
        if (this.isDisposed) return;
        this.registry.update();
    }
}
