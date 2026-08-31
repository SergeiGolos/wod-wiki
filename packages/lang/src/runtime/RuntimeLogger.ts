/**
 * RuntimeLogger - Centralized debug logging for the runtime engine.
 * 
 * Enable/disable via:
 * - `RuntimeLogger.enable()` / `RuntimeLogger.disable()`
 * - `window.__WOD_DEBUG__ = true` in browser console
 * 
 * Logs:
 * - Block push/pop with behaviors
 * - `next()` calls
 * - Events that produce actions
 * - Memory updates
 */

import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IEvent } from './contracts/events/IEvent';

/** Well-known debug globals this module installs on the browser window. */
interface DebugWindow {
    __WOD_DEBUG__?: boolean;
    RuntimeLogger?: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RuntimeLogEntry {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: Record<string, unknown>;
}

class RuntimeLoggerImpl {
    // Console is this logger's designated output sink; all writes funnel
    // through this single reference so the no-console rule is waived once.
    // eslint-disable-next-line no-console
    private readonly _console = console;
    private _enabled = false;
    private _history: RuntimeLogEntry[] = [];
    private _maxHistory = 500;

    // Style constants for console output
    private readonly STYLES = {
        push: 'color: #22c55e; font-weight: bold',      // green
        pop: 'color: #ef4444; font-weight: bold',       // red
        next: 'color: #3b82f6; font-weight: bold',      // blue
        event: 'color: #a855f7; font-weight: bold',     // purple
        memory: 'color: #f59e0b; font-weight: bold',    // amber
        action: 'color: #6366f1; font-weight: normal',  // indigo
        origin: 'color: #64748b; font-weight: normal', // slate
    };

    constructor() {
        // Check for global debug flag in browser
        if (typeof window !== 'undefined') {
            // window is the documented host for this debug flag.
            const debugWindow = window as unknown as DebugWindow;
            this._enabled = !!debugWindow.__WOD_DEBUG__;
        }
    }

    get enabled(): boolean {
        return this._enabled;
    }

    enable(): void {
        this._enabled = true;
        this._console.log('%c[RT] 🔧 Runtime logging ENABLED', 'color: #22c55e; font-weight: bold');
    }

    disable(): void {
        this._enabled = false;
        this._console.log('%c[RT] Runtime logging disabled', 'color: #64748b');
    }

    getHistory(): RuntimeLogEntry[] {
        return [...this._history];
    }

    clearHistory(): void {
        this._history = [];
    }

    // ============================================================================
    // Logging Methods
    // ============================================================================

    /**
     * Log when a block is pushed onto the stack
     */
    logPush(block: IRuntimeBlock, parentKey?: string): void {
        if (!this._enabled) return;

        const behaviors = this.getBehaviorNames(block);
        const memoryTypes = block.getAllMemory?.().map(loc => loc.tag) ?? [];

        this._console.groupCollapsed(
            `%c[RT] ▶ PUSH %c${block.label || block.blockType || 'Block'}%c [${block.key.toString().slice(0, 8)}]`,
            this.STYLES.push,
            'color: inherit; font-weight: bold',
            'color: #64748b; font-weight: normal'
        );
        this._console.log('Key:', block.key.toString());
        if (parentKey) this._console.log('Parent:', parentKey);
        this._console.log('Source IDs:', block.sourceIds);
        this._console.log('Behaviors:', behaviors);
        if (memoryTypes.length > 0) this._console.log('Memory Types:', memoryTypes);
        this._console.groupEnd();

        this.addToHistory('info', 'push', `PUSH ${block.label}`, {
            key: block.key.toString(),
            parentKey,
            behaviors,
            sourceIds: block.sourceIds,
        });
    }

    /**
     * Log when a block is popped from the stack
     */
    logPop(block: IRuntimeBlock, reason?: string): void {
        if (!this._enabled) return;

        this._console.log(
            `%c[RT] ◀ POP  %c${block.label || block.blockType || 'Block'}%c [${block.key.toString().slice(0, 8)}]${reason ? ` (${reason})` : ''}`,
            this.STYLES.pop,
            'color: inherit; font-weight: bold',
            'color: #64748b; font-weight: normal'
        );

        this.addToHistory('info', 'pop', `POP ${block.label}`, {
            key: block.key.toString(),
            reason,
        });
    }

    /**
     * Log when next() is called on a block
     */
    logNext(block: IRuntimeBlock, actions: IRuntimeAction[]): void {
        if (!this._enabled) return;

        const actionNames = actions.map(a => a.type || a.constructor?.name || 'Action');

        if (actions.length === 0) {
            // Only log if there are actions, per user request
            return;
        }

        this._console.groupCollapsed(
            `%c[RT] → NEXT %c${block.label || 'Block'}%c → ${actions.length} action(s)`,
            this.STYLES.next,
            'color: inherit; font-weight: bold',
            'color: #64748b; font-weight: normal'
        );
        this._console.log('Block:', block.key.toString());
        this._console.log('Actions:', actionNames);
        this._console.groupEnd();

        this.addToHistory('info', 'next', `NEXT ${block.label}`, {
            key: block.key.toString(),
            actions: actionNames,
        });
    }

    /**
     * Log when an event produces actions
     */
    logEvent(event: IEvent, actions: IRuntimeAction[]): void {
        if (!this._enabled) return;

        // Skip tick events that produce no actions (per user request)
        if (actions.length === 0) return;

        const actionNames = actions.map(a => a.type || a.constructor?.name || 'Action');

        this._console.groupCollapsed(
            `%c[RT] ⚡ EVENT %c${event.name}%c → ${actions.length} action(s)`,
            this.STYLES.event,
            'color: inherit; font-weight: bold',
            'color: #64748b; font-weight: normal'
        );
        this._console.log('Event Data:', event.data);
        this._console.log('Actions:', actionNames);
        this._console.groupEnd();

        this.addToHistory('info', 'event', `EVENT ${event.name}`, {
            eventName: event.name,
            eventData: event.data,
            actions: actionNames,
        });
    }

    /**
     * Log when memory is updated on a block
     */
    logMemoryUpdate(blockKey: string, memoryType: string, value: unknown): void {
        if (!this._enabled) return;

        // Create a simplified view of the value
        let displayValue: unknown = value;
        if (typeof value === 'object' && value !== null) {
            // For objects, show a summary
            displayValue = this.summarizeObject(value as unknown as Record<string, unknown>);
        }

        this._console.log(
            `%c[RT] 📝 MEMORY %c${memoryType}%c on [${blockKey.slice(0, 8)}]:`,
            this.STYLES.memory,
            'color: inherit; font-weight: bold',
            'color: #64748b; font-weight: normal',
            displayValue
        );

        this.addToHistory('debug', 'memory', `MEMORY ${memoryType}`, {
            blockKey,
            memoryType,
            value: displayValue,
        });
    }

    /**
     * Log action execution (verbose, under a group)
     */
    logAction(action: IRuntimeAction, depth: number): void {
        if (!this._enabled) return;

        const indent = '  '.repeat(depth);
        const actionName = action.type || action.constructor?.name || 'Action';

        this._console.log(
            `%c[RT] ${indent}⚙ %c${actionName}`,
            this.STYLES.action,
            'color: inherit'
        );
    }

    /**
     * General-purpose message log for runtime consumers.
     * Gates on _enabled; writes to the console sink and history.
     */
    logMessage(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): void {
        if (!this._enabled) return;

        this._console.log(`%c[RT] ${category} %c${message}`, this.styleFor(level), 'color: inherit');
        this.addToHistory(level, category, message, data);
    }

    /**
     * Always-on variant of `logMessage`. Use sparingly for errors/warnings that
     * must be visible even when debug logging is disabled.
     */
    logAlways(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): void {
        this._console.log(`%c[RT] ${category} %c${message}`, this.styleFor(level), 'color: inherit');
        this.addToHistory(level, category, message, data);
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private getBehaviorNames(block: IRuntimeBlock): string[] {
        // Access behaviors via reflection if possible
        const blockWithBehaviors = block as unknown as { behaviors?: readonly IRuntimeBehavior[] };
        const behaviors = blockWithBehaviors.behaviors;
        if (!behaviors || !Array.isArray(behaviors)) return [];
        return behaviors.map(b => b.constructor?.name || 'Behavior');
    }

    private summarizeObject(obj: Record<string, unknown>): Record<string, unknown> {
        const summary: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
            if (Array.isArray(val)) {
                summary[key] = `[${val.length} items]`;
            } else if (typeof val === 'object' && val !== null) {
                summary[key] = '{...}';
            } else {
                summary[key] = val;
            }
        }
        return summary;
    }

    private styleFor(level: LogLevel): string {
        switch (level) {
            case 'error': return 'color: #ef4444; font-weight: bold';
            case 'warn': return 'color: #f59e0b; font-weight: bold';
            case 'info': return 'color: #3b82f6; font-weight: bold';
            default: return 'color: #64748b';
        }
    }

    private addToHistory(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): void {
        this._history.push({
            timestamp: new Date(),
            level,
            category,
            message,
            data,
        });

        // Trim history if too large
        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(-this._maxHistory);
        }
    }
}

// Singleton instance
export const RuntimeLogger = new RuntimeLoggerImpl();

// Make available on window for easy debugging
if (typeof window !== 'undefined') {
    // window is the documented host for runtime debug tooling.
    (window as unknown as DebugWindow).RuntimeLogger = RuntimeLogger;
}
