import React from 'react';
import { createRoot } from 'react-dom/client';
import CastReceiver from './CastReceiver';
import '../index.css';

// Initialize cast receiver
const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

// Register custom namespace
if (!options.customNamespaces) {
  options.customNamespaces = {};
}
options.customNamespaces['urn:x-cast:com.wod.wiki'] = cast.framework.system.MessageType.JSON;

// Important: Set up support for video capability without implementing a player
// This registers your intention to handle media-related messages even though
// you're not actually displaying media
const playerManager = context.getPlayerManager();

// Add a basic no-op handler for LOAD requests
// This signals to the framework that you support video content
// even though you're not actually playing it
playerManager.setMessageInterceptors({
  'LOAD': (loadRequestData) => {
    console.log('Media LOAD request received but ignored (HTML-only app):', loadRequestData);
    
    // You could send a custom message back to the sender explaining
    // that this is an HTML-only app, if you want
    
    // Return the data unchanged
    return loadRequestData;
  }
});

// Initialize React app
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <CastReceiver />
  </React.StrictMode>
);

// Start the receiver with the updated options
context.start(options);
