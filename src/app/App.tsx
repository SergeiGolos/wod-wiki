import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { NotebookPage } from './pages/NotebookPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotebookProvider } from '@/components/notebook/NotebookContext';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { migrationService } from '@/services/db/MigrationService';

const provider = new IndexedDBContentProvider();

export const App: React.FC = () => {
    React.useEffect(() => {
        migrationService.runMigration().catch(console.error);
    }, []);

    return (
        <HashRouter>
            <NotebookProvider>
                <Routes>
                    <Route path="/" element={<HistoryPage provider={provider} />} />
                    <Route path="/history" element={<Navigate to="/" replace />} />
                    <Route path="/note/:id" element={<Navigate to="plan" replace />} />
                    <Route path="/note/:id/:view" element={<NotebookPage provider={provider} />} />
                    <Route path="/playground" element={<Navigate to="/playground/plan" replace />} />
                    <Route path="/playground/:view" element={<PlaygroundPage />} />
                    <Route path="/plan" element={<Navigate to="/" replace />} />
                </Routes>
            </NotebookProvider>
        </HashRouter>
    );
};
