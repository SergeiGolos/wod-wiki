/**
 * WorkbenchEventBus — cross-panel workbench event channel.
 *
 * The seam is {@link SimpleEventBus}; this module wraps it with typed
 * emit / subscribe helpers so call sites do not have to discriminate the
 * payload type at every use. Callers can also access the underlying
 * {@link IServiceEventBus} via `workbenchEventBus.bus` for untyped use.
 *
 * No module-load global reads — the bus is a plain instance and ready to
 * receive events as soon as the module is imported.
 */

import { ScriptBlock } from '../components/Editor/types';
import { SimpleEventBus } from './events/SimpleEventBus';
import type { IServiceEventBus } from './events/IServiceEventBus';

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
    block: ScriptBlock;
}

export type WorkbenchEventPayload =
    | { type: WorkbenchEvent.SCROLL_TO_BLOCK; payload: ScrollToBlockPayload }
    | { type: WorkbenchEvent.HIGHLIGHT_BLOCK; payload: HighlightBlockPayload }
    | { type: WorkbenchEvent.BLOCK_CLICKED; payload: ScrollToBlockPayload }
    | { type: WorkbenchEvent.NAVIGATE_TO; payload: NavigateToPayload }
    | { type: WorkbenchEvent.START_WORKOUT; payload: StartWorkoutPayload };

/**
 * Typed helper bag around a {@link SimpleEventBus}. Each `onX` returns an
 * unsubscribe function; each `emitX` is a typed payload builder. The
 * underlying bus is exposed as `.bus` for tests and advanced callers
 * that want to subscribe to multiple event types in one place.
 */
export class WorkbenchEventBus {
    readonly bus: IServiceEventBus<WorkbenchEventPayload> = new SimpleEventBus<WorkbenchEventPayload>();

    // --- emit helpers ---

    emitScrollToBlock(blockId: string, source: string = 'unknown') {
        this.bus.emit({ type: WorkbenchEvent.SCROLL_TO_BLOCK, payload: { blockId, source } });
    }

    emitHighlightBlock(blockId: string, source: string = 'unknown') {
        this.bus.emit({ type: WorkbenchEvent.HIGHLIGHT_BLOCK, payload: { blockId, source } });
    }

    emitStartWorkout(block: ScriptBlock) {
        this.bus.emit({ type: WorkbenchEvent.START_WORKOUT, payload: { block } });
    }

    emitNavigateTo(entryId: string, view?: string) {
        this.bus.emit({ type: WorkbenchEvent.NAVIGATE_TO, payload: { entryId, view } });
    }

    // --- subscribe helpers ---

    onScrollToBlock(callback: (payload: ScrollToBlockPayload) => void): () => void {
        return this.bus.subscribe((e) => {
            if (e.type === WorkbenchEvent.SCROLL_TO_BLOCK) callback(e.payload);
        });
    }

    onHighlightBlock(callback: (payload: HighlightBlockPayload) => void): () => void {
        return this.bus.subscribe((e) => {
            if (e.type === WorkbenchEvent.HIGHLIGHT_BLOCK) callback(e.payload);
        });
    }

    onStartWorkout(callback: (payload: StartWorkoutPayload) => void): () => void {
        return this.bus.subscribe((e) => {
            if (e.type === WorkbenchEvent.START_WORKOUT) callback(e.payload);
        });
    }

    onNavigateTo(callback: (payload: NavigateToPayload) => void): () => void {
        return this.bus.subscribe((e) => {
            if (e.type === WorkbenchEvent.NAVIGATE_TO) callback(e.payload);
        });
    }
}

export const workbenchEventBus = new WorkbenchEventBus();
