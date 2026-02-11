import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { NotebookPage } from './pages/NotebookPage';
import { WodPage } from './pages/WodPage';

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PlaygroundPage />} />
                <Route path="/notes" element={<NotebookPage />} />
                <Route path="/note/:id" element={<WodPage />} />
            </Routes>
        </BrowserRouter>
    );
};
