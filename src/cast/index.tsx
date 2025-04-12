import React from 'react';
import { createRoot } from 'react-dom/client';
import CastReceiver from './CastReceiver';
import '../index.css';

// Initialize cast receiver
const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

// Initialize React app
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <CastReceiver />
  </React.StrictMode>
);

// Start the receiver
context.start(options);
