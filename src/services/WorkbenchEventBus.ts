import { WodBlock } from '../markdown-editor/types';

export enum WorkbenchEvent {
    // Navigation / Sync
    SCROLL_TO_BLOCK = 'workbench:scroll-to-block',    // Request editor to scroll to block
    HIGHLIGHT_BLOCK = 'workbench:highlight-block',    // Editor reports cursor is in block
    BLOCK_CLICKED = 'workbench:block-clicked',        // User clicked a block in preview

    // Actions
    START_WORKOUT = 'workbench:start-workout',        // Request to start a specific block
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

// Simple EventEmitter implementation compatible with browser
class SimpleEventEmitter {
    private listeners: Record<string, Function[]> = {};

    emit(event: string, ...args: any[]) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(listener => listener(...args));
    }

    on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
        return () => this.off(event, listener);
    }

    off(event: string, listener: Function) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
}

class WorkbenchEventBus extends SimpleEventEmitter {
    emitScrollToBlock(blockId: string, source: string = 'unknown') {
        this.emit(WorkbenchEvent.SCROLL_TO_BLOCK, { blockId, source } as ScrollToBlockPayload);
    }

    emitHighlightBlock(blockId: string, source: string = 'unknown') {
        this.emit(WorkbenchEvent.HIGHLIGHT_BLOCK, { blockId, source } as HighlightBlockPayload);
    }

    emitStartWorkout(block: WodBlock) {
        this.emit(WorkbenchEvent.START_WORKOUT, { block } as StartWorkoutPayload);
    }

    onScrollToBlock(callback: (payload: ScrollToBlockPayload) => void) {
        this.on(WorkbenchEvent.SCROLL_TO_BLOCK, callback);
        return () => this.off(WorkbenchEvent.SCROLL_TO_BLOCK, callback);
    }

    onHighlightBlock(callback: (payload: HighlightBlockPayload) => void) {
        this.on(WorkbenchEvent.HIGHLIGHT_BLOCK, callback);
        return () => this.off(WorkbenchEvent.HIGHLIGHT_BLOCK, callback);
    }

    onStartWorkout(callback: (payload: StartWorkoutPayload) => void) {
        this.on(WorkbenchEvent.START_WORKOUT, callback);
        return () => this.off(WorkbenchEvent.START_WORKOUT, callback);
    }
}

export const workbenchEventBus = new WorkbenchEventBus();
