import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { NotebookPage } from './pages/NotebookPage';
import { HistoryPage } from './pages/HistoryPage';

export const App: React.FC = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/history" replace />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/note/:id" element={<Navigate to="plan" replace />} />
                <Route path="/note/:id/:view" element={<NotebookPage />} />
                <Route path="/playground" element={<Navigate to="/playground/plan" replace />} />
                <Route path="/playground/:view" element={<PlaygroundPage />} />
                <Route path="/plan" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
};
