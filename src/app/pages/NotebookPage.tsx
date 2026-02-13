import React, { useEffect, useState, useRef } from 'react';
import { Workbench } from '@/components/layout/Workbench';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';
import { PLAYGROUND_CONTENT, getDailyTitle, getDailyTemplate } from '@/constants/defaultContent';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { toNotebookTag } from '@/types/notebook';

import type { IContentProvider } from '@/types/content-provider';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';

export const NotebookPage: React.FC<{ provider?: IContentProvider }> = ({ provider: propProvider }) => {
    const { id: routeId } = useParams<{ id: string }>();
    const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);
    const { activeNotebookId } = useNotebooks();

    // Default to LocalStorage if not provided
    const provider = useMemo(() => propProvider || new LocalStorageContentProvider(), [propProvider]);

    const navigate = useNavigate();
    const commandStrategy = useMemo(() => new WodNavigationStrategy(navigate), [navigate]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const init = async () => {
            try {
                // Build tags that include the active notebook
                const baseTags = (tags: string[]) => {
                    if (activeNotebookId) {
                        return [...tags, toNotebookTag(activeNotebookId)];
                    }
                    return tags;
                };

                // Check if totally empty (first load)
                const allEntries = await provider.getEntries();
                if (allEntries.length === 0) {
                    console.log('First load detected. Seeding with playground content...');
                    const newEntry = await provider.saveEntry({
                        title: 'Playground',
                        rawContent: PLAYGROUND_CONTENT,
                        tags: baseTags(['playground']),
                        notes: '',
                        targetDate: Date.now()
                    });
                    setInitialContent(newEntry.rawContent);
                    navigate(`/note/${newEntry.id}/plan`);
                    return;
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Check for existing daily log
                const dailyEntries = await provider.getEntries({
                    tags: ['daily'],
                    dateRange: { start: today.getTime(), end: tomorrow.getTime() }
                });

                if (dailyEntries.length > 0) {
                    console.log('Found existing daily log:', dailyEntries[0].id);
                    setInitialContent(dailyEntries[0].rawContent);
                } else {
                    console.log('Creating new daily log...');
                    const newEntry = await provider.saveEntry({
                        title: getDailyTitle(),
                        rawContent: getDailyTemplate(),
                        tags: baseTags(['daily']),
                        notes: '',
                        targetDate: Date.now()
                    });
                    setInitialContent(newEntry.rawContent);
                    navigate(`/note/${newEntry.id}/plan`);
                }
            } catch (e) {
                console.error('Error initializing Notebook:', e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <div className="text-center">
                    <div className="text-xl font-bold mb-2 uppercase tracking-widest opacity-20">WOD.WIKI</div>
                    <div className="text-sm opacity-50 animate-pulse">Initializing Notebook...</div>
                </div>
            </div>
        );
    }

    return (
        <Workbench
            provider={provider}
            initialContent={initialContent}
            initialActiveEntryId={routeId}
            commandStrategy={commandStrategy}
        />
    );
};
