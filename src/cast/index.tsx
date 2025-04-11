import React from 'react';
import ReactDOM from 'react-dom/client';
import CastReceiver from './CastReceiver';
import '../index.css'; // Import Tailwind CSS

/**
 * Entry point for the ChromeCast receiver application
 * This will be accessed via the `/cast` path in Storybook
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CastReceiver />
  </React.StrictMode>
);
