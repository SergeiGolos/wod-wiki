/**
 * NotebookService — CRUD for notebooks stored in localStorage.
 *
 * Notebooks are stored under `wodwiki:notebooks` as a JSON array.
 * The active notebook ID is stored under `wodwiki:active-notebook`.
 *
 * Entry membership is managed through the entry's `tags` array
 * using the `notebook:{id}` convention.
 */

import type { Notebook } from '../types/notebook';

const NOTEBOOKS_KEY = 'wodwiki:notebooks';
const ACTIVE_KEY = 'wodwiki:active-notebook';

const DEFAULT_ICONS = ['📓', '🏋️', '🔥', '💪', '⭐', '🎯', '🏃', '🧘', '🥊', '🚴'];

export class NotebookService {

    getAll(): Notebook[] {
        try {
            const raw = localStorage.getItem(NOTEBOOKS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Notebook[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    getById(id: string): Notebook | null {
        return this.getAll().find(n => n.id === id) ?? null;
    }

    create(name: string, description = '', icon = '📓'): Notebook {
        const notebooks = this.getAll();
        const now = Date.now();
        const notebook: Notebook = {
            id: crypto.randomUUID(),
            name,
            description,
            icon,
            createdAt: now,
            lastEditedAt: now,
        };
        notebooks.push(notebook);
        this.saveAll(notebooks);
        return notebook;
    }

    update(id: string, patch: Partial<Pick<Notebook, 'name' | 'description' | 'icon'>>): Notebook {
        const notebooks = this.getAll();
        const idx = notebooks.findIndex(n => n.id === id);
        if (idx === -1) throw new Error(`Notebook not found: ${id}`);
        notebooks[idx] = {
            ...notebooks[idx],
            ...patch,
            lastEditedAt: Date.now(),
        };
        this.saveAll(notebooks);
        return notebooks[idx];
    }

    delete(id: string): void {
        const notebooks = this.getAll().filter(n => n.id !== id);
        this.saveAll(notebooks);
        if (this.getActiveId() === id) {
            this.setActiveId(null);
        }
    }

    touchNotebook(id: string): void {
        const notebooks = this.getAll();
        const idx = notebooks.findIndex(n => n.id === id);
        if (idx !== -1) {
            notebooks[idx].lastEditedAt = Date.now();
            this.saveAll(notebooks);
        }
    }

    getActiveId(): string | null {
        return localStorage.getItem(ACTIVE_KEY);
    }

    setActiveId(id: string | null): void {
        if (id === null) {
            localStorage.removeItem(ACTIVE_KEY);
        } else {
            localStorage.setItem(ACTIVE_KEY, id);
        }
    }

    /**
     * Returns the last-edited notebook, used for auto-selection on page load.
     */
    getLastEdited(): Notebook | null {
        const notebooks = this.getAll();
        if (notebooks.length === 0) return null;
        return notebooks.reduce((a, b) => (a.lastEditedAt >= b.lastEditedAt ? a : b));
    }

    /**
     * Ensures at least one notebook exists. Creates "My Workouts" if empty.
     * Returns the active notebook ID (resolved or newly created).
     */
    ensureDefault(): string {
        let notebooks = this.getAll();
        if (notebooks.length === 0) {
            const created = this.create('My Workouts', 'Default workout notebook', '📓');
            this.setActiveId(created.id);
            return created.id;
        }

        // If there's a saved active ID that still exists, use it
        const activeId = this.getActiveId();
        if (activeId && notebooks.some(n => n.id === activeId)) {
            return activeId;
        }

        // Otherwise, auto-select the last edited
        const lastEdited = this.getLastEdited();
        if (lastEdited) {
            this.setActiveId(lastEdited.id);
            return lastEdited.id;
        }

        return notebooks[0].id;
    }

    /** Available icons for notebook creation */
    static readonly ICONS = DEFAULT_ICONS;

    private saveAll(notebooks: Notebook[]): void {
        localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
    }
}

/** Singleton instance */
export const notebookService = new NotebookService();
