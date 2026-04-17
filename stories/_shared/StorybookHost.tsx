import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AudioProvider } from '@/components/audio/AudioContext';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';
import { CommandProvider } from '@/components/command-palette/CommandContext';
import { NotebookProvider } from '@/components/notebook/NotebookContext';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

interface StorybookHostProps {
    children: React.ReactNode;
    initialEntries?: string[]; // Routes to simulate
}

export const StorybookHost: React.FC<StorybookHostProps> = ({
    children,
    initialEntries = ['/']
}) => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="storybook-theme">
            <AudioProvider>
                <DebugModeProvider>
                    <MemoryRouter initialEntries={initialEntries}>
                        <NuqsTestingAdapter>
                            <NotebookProvider>
                                <CommandProvider>
                                    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
                                        {children}
                                    </div>
                                </CommandProvider>
                            </NotebookProvider>
                        </NuqsTestingAdapter>
                    </MemoryRouter>
                </DebugModeProvider>
            </AudioProvider>
        </ThemeProvider>
    );
};
