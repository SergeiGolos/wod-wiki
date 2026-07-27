import React, { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@/contexts/ThemeProvider';
import { AudioProvider } from '@/contexts/AudioContext';
import { DebugModeProvider } from '@/contexts/DebugModeContext';

import { NotebookProvider } from '@/contexts/NotebookContext';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

/** Syncs the Storybook toolbar theme selection with the ThemeProvider context. */
const ThemeSync: React.FC<{ theme?: 'light' | 'dark' | 'system' }> = ({ theme }) => {
    const { setTheme } = useTheme();
    useEffect(() => {
        if (theme) setTheme(theme);
    }, [theme, setTheme]);
    return null;
};

interface StorybookHostProps {
    children: React.ReactNode;
    initialEntries?: string[]; // Routes to simulate
    theme?: 'light' | 'dark' | 'system';
}

export const StorybookHost: React.FC<StorybookHostProps> = ({
    children,
    initialEntries = ['/'],
    theme,
}) => {
    return (
        <ThemeProvider defaultTheme={theme || 'light'} storageKey="storybook-theme">
            <ThemeSync theme={theme} />
            <AudioProvider>
                <DebugModeProvider>
                    <MemoryRouter initialEntries={initialEntries}>
                        <NuqsTestingAdapter>
                        <NotebookProvider>
                            <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
                                {children}
                            </div>
                        </NotebookProvider>

                        </NuqsTestingAdapter>
                    </MemoryRouter>
                </DebugModeProvider>
            </AudioProvider>
        </ThemeProvider>
    );
};
