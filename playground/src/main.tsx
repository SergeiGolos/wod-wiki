import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../../src/index.css';
import { migratePlaygroundContent } from './services/migratePlaygroundContent';

// Consolidate legacy playground content into the unified notes store before
// render, so content hooks never race the one-time migration. Flag-gated no-op
// after the first run.
migratePlaygroundContent().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
