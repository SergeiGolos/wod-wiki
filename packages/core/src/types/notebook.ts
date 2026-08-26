/**
 * Notebook Types
 *
 * A notebook is a named, tag-based collection of workout entries.
 */

export interface Notebook {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: number;
  lastEditedAt: number;
}

export const NOTEBOOK_TAG_PREFIX = 'notebook:';

export const toNotebookTag = (notebookId: string): string =>
  `${NOTEBOOK_TAG_PREFIX}${notebookId}`;

export const fromNotebookTag = (tag: string): string | null =>
  tag.startsWith(NOTEBOOK_TAG_PREFIX) ? tag.slice(NOTEBOOK_TAG_PREFIX.length) : null;

export const isNotebookTag = (tag: string): boolean =>
  tag.startsWith(NOTEBOOK_TAG_PREFIX);
