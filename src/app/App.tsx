import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { NotebookPage } from './pages/NotebookPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotebookProvider } from '@/components/notebook/NotebookContext';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { migrationService } from '@/services/db/MigrationService';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AudioProvider } from '@/components/audio/AudioContext';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';

const provider = new IndexedDBContentProvider();

export const App: React.FC = () => {
    React.useEffect(() => {
        migrationService.runMigration().catch(console.error);
    }, []);

    return (
        <ThemeProvider defaultTheme="system" storageKey="wod-wiki-theme">
            <AudioProvider>
                <DebugModeProvider>
                    <HashRouter>
                        <NotebookProvider>
                            <Routes>
                                <Route path="/" element={<HistoryPage provider={provider} />} />
                                <Route path="/history" element={<Navigate to="/" replace />} />

                                {/* Note routes — progressive path segments */}
                                <Route path="/note/:noteId" element={<Navigate to="plan" replace />} />
                                <Route path="/note/:noteId/plan" element={<NotebookPage provider={provider} />} />
                                <Route path="/note/:noteId/track" element={<NotebookPage provider={provider} />} />
                                <Route path="/note/:noteId/track/:sectionId" element={<NotebookPage provider={provider} />} />
                                <Route path="/note/:noteId/review" element={<NotebookPage provider={provider} />} />
                                <Route path="/note/:noteId/review/:sectionId" element={<NotebookPage provider={provider} />} />
                                <Route path="/note/:noteId/review/:sectionId/:resultId" element={<NotebookPage provider={provider} />} />

                                {/* Legacy catch-all — supports old /note/:id/:view links */}
                                <Route path="/note/:noteId/:view" element={<NotebookPage provider={provider} />} />

                                {/* Playground (static / non-persisted) */}
                                <Route path="/playground" element={<Navigate to="/playground/plan" replace />} />
                                <Route path="/playground/plan" element={<PlaygroundPage />} />
                                <Route path="/playground/track" element={<PlaygroundPage />} />
                                <Route path="/playground/track/:sectionId" element={<PlaygroundPage />} />
                                <Route path="/playground/review" element={<PlaygroundPage />} />
                                <Route path="/playground/:view" element={<PlaygroundPage />} />

                                <Route path="/plan" element={<Navigate to="/" replace />} />
                            </Routes>
                        </NotebookProvider>
                    </HashRouter>
                </DebugModeProvider>
            </AudioProvider>
        </ThemeProvider>
    );
};
