import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/components/theme/ThemeProvider';
import { AudioProvider } from '../src/components/audio/AudioContext';
import { DebugModeProvider } from '../src/components/layout/DebugModeContext';
import { CommandProvider } from '../src/components/command-palette/CommandContext';
import { NotebookProvider } from '../src/components/notebook/NotebookContext';

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
                        <NotebookProvider>
                            <CommandProvider>
                                <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
                                    {children}
                                </div>
                            </CommandProvider>
                        </NotebookProvider>
                    </MemoryRouter>
                </DebugModeProvider>
            </AudioProvider>
        </ThemeProvider>
    );
};
