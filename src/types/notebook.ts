/**
 * Notebook Types
 *
 * A notebook is a named, tag-based collection of workout entries.
 * Entries belong to a notebook via their `tags` array using the
 * `notebook:{id}` convention.
 */

export interface Notebook {
    id: string;
    name: string;
    description: string;
    icon: string;           // emoji character
    createdAt: number;      // Unix ms
    lastEditedAt: number;   // Unix ms
}

/** The tag prefix used to associate entries with notebooks */
export const NOTEBOOK_TAG_PREFIX = 'notebook:';

/** Build a tag string for a given notebook ID */
export const toNotebookTag = (notebookId: string): string =>
    `${NOTEBOOK_TAG_PREFIX}${notebookId}`;

/** Extract notebook ID from a tag string, or null if not a notebook tag */
export const fromNotebookTag = (tag: string): string | null =>
    tag.startsWith(NOTEBOOK_TAG_PREFIX) ? tag.slice(NOTEBOOK_TAG_PREFIX.length) : null;

/** Check if a tag is a notebook tag */
export const isNotebookTag = (tag: string): boolean =>
    tag.startsWith(NOTEBOOK_TAG_PREFIX);
