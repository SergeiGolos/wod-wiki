import { editor } from 'monaco-editor';
import { RowBasedCardManager, InlineCard } from './inline-cards';
import { HiddenAreasCoordinator } from './utils/HiddenAreasCoordinator';

// Import CSS for row-based cards
import './inline-cards/row-cards.css';

// Re-export for backwards compatibility
export type { InlineCard as InlineWidgetCard } from './inline-cards';

export class RichMarkdownManager {
    private editor: editor.IStandaloneCodeEditor;
    private cardManager: RowBasedCardManager;
    
    // Callback for card actions (e.g., start workout)
    private onCardAction?: (card: InlineCard, action: string, payload?: unknown) => void;

    constructor(
        editorInstance: editor.IStandaloneCodeEditor,
        onCardAction?: (card: InlineCard, action: string, payload?: unknown) => void,
        hiddenAreasCoordinator?: HiddenAreasCoordinator
    ) {
        this.editor = editorInstance;
        this.onCardAction = onCardAction;

        // Initialize the row-based card system (new architecture)
        // Pass the hiddenAreasCoordinator through to prevent conflicts
        this.cardManager = new RowBasedCardManager(
            this.editor,
            (cardId, action, payload) => {
                if (this.onCardAction) {
                    // Get the card by ID to pass to the callback
                    const cards = this.cardManager.getCards();
                    const card = cards.find(c => c.id === cardId);
                    if (card) {
                        this.onCardAction(card, action, payload);
                    }
                }
                // Default handling for common actions
                if (action === 'start-workout') {
                    // Start workout requested
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
    public getCards(): InlineCard[] {
        return this.cardManager.getCards();
    }
}
