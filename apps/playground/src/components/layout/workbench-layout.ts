import { ReactNode } from 'react';

/**
 * Workbench Layout Configuration
 * Defines the structure and behavior of a workbench variant (Desktop, Mobile, etc.)
 */

export type PanelId = 'filter' | 'list' | 'preview' | 'monitor' | 'debug' | 'editor' | 'timer' | 'session' | 'analytics' | 'timeline';

export interface PanelConfig {
    id: PanelId;
    component: ReactNode; // Or a component factory function
    title?: string;
}

export interface ViewLayout {
    id: string; // e.g., 'history', 'plan', 'track'
    gridTemplateColumns: string; // e.g., "1fr 1fr 1fr"
    areas: string[][]; // e.g., [["filter", "list", "preview"]]
    panels: PanelId[]; // references to panels in the layout
}

export interface IWorkbenchLayout {
    views: Record<string, ViewLayout>;
    defaultView: string;
}

/**
 * Desktop Layout Configuration
 * 3-column / 2-column layouts
 */
export const desktopLayout: IWorkbenchLayout = {
    defaultView: 'history',
    views: {
        history: {
            id: 'history',
            gridTemplateColumns: '1fr 1fr 1fr',
            areas: [['filter', 'list', 'preview']],
            panels: ['filter', 'list', 'preview'],
        },
        plan: {
            id: 'plan',
            gridTemplateColumns: '1fr 1fr',
            areas: [['editor', 'preview']],
            panels: ['editor', 'preview'],
        },
        track: {
            id: 'track',
            gridTemplateColumns: '2fr 1fr',
            areas: [['timer', 'session']], // debug replaces session conditionally
            panels: ['timer', 'session'],
        },
        review: {
            id: 'review',
            gridTemplateColumns: '1fr 2fr',
            areas: [['session', 'timeline']],
            panels: ['session', 'timeline'],
        }
    }
};
