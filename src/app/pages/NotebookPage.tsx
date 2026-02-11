import React, { useEffect, useState } from 'react';
import { Workbench } from '@/components/layout/Workbench';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';


// Singleton instance to share state
const provider = new LocalStorageContentProvider();

const getDailyTitle = () => `Daily Log - ${new Date().toLocaleDateString()}`;

const DAILY_TEMPLATE = `# ${getDailyTitle()}

## Goals
- [ ] 

## Notes

`;

export const NotebookPage: React.FC = () => {
    const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const commandStrategy = useMemo(() => new WodNavigationStrategy(navigate), [navigate]);

    useEffect(() => {
        const init = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Check for existing daily log
                const entries = await provider.getEntries({
                    tags: ['daily'],
                    dateRange: { start: today.getTime(), end: tomorrow.getTime() }
                });

                if (entries.length > 0) {
                    console.log('Found existing daily log:', entries[0].id);
                    setInitialContent(entries[0].rawContent);
                } else {
                    console.log('Creating new daily log...');
                    const newEntry = await provider.saveEntry({
                        title: getDailyTitle(),
                        rawContent: DAILY_TEMPLATE,
                        tags: ['daily'],

                        notes: ''
                    });
                    setInitialContent(newEntry.rawContent);
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
                Loading Notebook...
            </div>
        );
    }

    return (
        <Workbench
            provider={provider}
            mode="history"
            initialContent={initialContent}
            commandStrategy={commandStrategy}
        />
    );
};
