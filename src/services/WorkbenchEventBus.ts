import { WodBlock } from '../components/Editor/types';
import { SimpleEventBus } from './events/SimpleEventBus';

export enum WorkbenchEvent {
    // Navigation / Sync
    SCROLL_TO_BLOCK = 'workbench:scroll-to-block',    // Request editor to scroll to block
    HIGHLIGHT_BLOCK = 'workbench:highlight-block',    // Editor reports cursor is in block
    BLOCK_CLICKED = 'workbench:block-clicked',        // User clicked a block in preview
    NAVIGATE_TO = 'workbench:navigate-to',            // Request navigation to another entry

    // Actions
    START_WORKOUT = 'workbench:start-workout',        // Request to start a specific block
}

export interface NavigateToPayload {
    entryId: string;
    view?: string;
}

export interface ScrollToBlockPayload {
    blockId: string;
    source?: string; // 'preview' | 'timeline' | etc
}

export interface HighlightBlockPayload {
    blockId: string;
    source?: string; // 'editor'
}

export interface StartWorkoutPayload {
    block: WodBlock;
}

export type WorkbenchEventPayload =
    | { type: WorkbenchEvent.SCROLL_TO_BLOCK; payload: ScrollToBlockPayload }
    | { type: WorkbenchEvent.HIGHLIGHT_BLOCK; payload: HighlightBlockPayload }
    | { type: WorkbenchEvent.BLOCK_CLICKED; payload: ScrollToBlockPayload }
    | { type: WorkbenchEvent.NAVIGATE_TO; payload: NavigateToPayload }
    | { type: WorkbenchEvent.START_WORKOUT; payload: StartWorkoutPayload };

class WorkbenchEventBus {
    private bus = new SimpleEventBus<WorkbenchEventPayload>();

    // --- emit helpers ---

    emitScrollToBlock(blockId: string, source: string = 'unknown') {
        this.bus.emit({ type: WorkbenchEvent.SCROLL_TO_BLOCK, payload: { blockId, source } });
    }

    emitHighlightBlock(blockId: string, source: string = 'unknown') {
        this.bus.emit({ type: WorkbenchEvent.HIGHLIGHT_BLOCK, payload: { blockId, source } });
    }

    emitStartWorkout(block: WodBlock) {
        this.bus.emit({ type: WorkbenchEvent.START_WORKOUT, payload: { block } });
    }

    emitNavigateTo(entryId: string, view?: string) {
        this.bus.emit({ type: WorkbenchEvent.NAVIGATE_TO, payload: { entryId, view } });
    }

    // --- subscribe helpers ---

    onScrollToBlock(callback: (payload: ScrollToBlockPayload) => void): () => void {
        return this.bus.subscribe(e => {
            if (e.type === WorkbenchEvent.SCROLL_TO_BLOCK) callback(e.payload);
        });
    }

    onHighlightBlock(callback: (payload: HighlightBlockPayload) => void): () => void {
        return this.bus.subscribe(e => {
            if (e.type === WorkbenchEvent.HIGHLIGHT_BLOCK) callback(e.payload);
        });
    }

    onStartWorkout(callback: (payload: StartWorkoutPayload) => void): () => void {
        return this.bus.subscribe(e => {
            if (e.type === WorkbenchEvent.START_WORKOUT) callback(e.payload);
        });
    }

    onNavigateTo(callback: (payload: NavigateToPayload) => void): () => void {
        return this.bus.subscribe(e => {
            if (e.type === WorkbenchEvent.NAVIGATE_TO) callback(e.payload);
        });
    }
}

export const workbenchEventBus = new WorkbenchEventBus();
