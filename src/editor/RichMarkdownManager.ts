import { editor } from 'monaco-editor';
import { InlineWidgetCardManager, InlineWidgetCard } from './inline-cards';
import { HiddenAreasCoordinator } from './utils/HiddenAreasCoordinator';

export class RichMarkdownManager {
    private editor: editor.IStandaloneCodeEditor;
    private cardManager: InlineWidgetCardManager;
    
    // Callback for card actions (e.g., start workout)
    private onCardAction?: (card: InlineWidgetCard, action: string, payload?: unknown) => void;

    constructor(
        editorInstance: editor.IStandaloneCodeEditor,
        onCardAction?: (card: InlineWidgetCard, action: string, payload?: unknown) => void,
        hiddenAreasCoordinator?: HiddenAreasCoordinator
    ) {
        this.editor = editorInstance;
        this.onCardAction = onCardAction;

        // Initialize the inline widget card system
        this.cardManager = new InlineWidgetCardManager(
            this.editor,
            (card, action, payload) => {
                if (this.onCardAction) {
                    this.onCardAction(card, action, payload);
                }
                // Default handling for common actions
                if (action === 'start-workout') {
                    console.log('[RichMarkdownManager] Start workout requested for:', card.id);
                }
            },
            hiddenAreasCoordinator
        );
    }

    public dispose() {
        this.cardManager.dispose();
    }
    
    /**
     * Force refresh of all cards
     */
    public refresh() {
        this.cardManager.refresh();
    }
    
    /**
     * Get all current cards
     */
    public getCards(): InlineWidgetCard[] {
        return this.cardManager.getCards();
    }
}
