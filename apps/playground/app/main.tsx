import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/telemetry-gtag';
import '../src/index.css';
import { apiPrefsMode, hydrateMetaPrefs } from '@/services/storage/metaStore';

const root = createRoot(document.getElementById('root')!);

function renderApp() {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if (apiPrefsMode) {
  // Server mode: pull notebooks + route WQL defaults/shortcuts into the
  // hydrated pref cache BEFORE first render. On failure the app must not
  // render into default state — later writes (e.g. ensureDefault creating
  // "My Workouts") would clobber the unreachable remote rows. Show a
  // blocking error with a retry instead.
  const boot = () => {
    hydrateMetaPrefs()
      .then(renderApp)
      .catch((err) => {
        console.error('[metaStore] pref hydration failed:', err);
        root.render(
          <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-semibold">Saved preferences couldn't be loaded from the server.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Notebooks and saved query defaults were not loaded, so the app stays closed to protect them.
            </p>
            <button
              onClick={boot}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Retry
            </button>
          </div>,
        );
      });
  };
  boot();
} else {
  renderApp();
}
