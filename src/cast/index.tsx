import React from 'react';
import { createRoot } from 'react-dom/client';
import CastReceiver from './CastReceiver';
import '../index.css';

// Custom message namespace - must match the sender
const CAST_NAMESPACE = "urn:x-cast:com.google.cast.cac";

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Cast Receiver index.tsx loaded, initializing...');

  // Initialize React app
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <CastReceiver />
    </React.StrictMode>
  );

  // Initialize cast receiver when the framework is available
  const initializeCastReceiver = () => {
    if (!window.cast || !window.cast.framework) {
      console.error('Cast Receiver Framework not available yet');
      return;
    }

    // Initialize cast receiver
    console.log('Initializing Cast Receiver Context...');
    const context = window.cast.framework.CastReceiverContext.getInstance();
    const options = new window.cast.framework.CastReceiverOptions();
    
    // Important: disable idle timeout to prevent automatic shutdown
    options.disableIdleTimeout = true;
    
    // Set up custom messaging namespace
    options.customNamespaces = {
      [CAST_NAMESPACE]: 'JSON'
    };

    console.log('Starting receiver with options:', options);
    
    // Start the receiver with the updated options
    context.start(options);
  };

  // Check if Cast API is available now
  if (window.cast && window.cast.framework) {
    initializeCastReceiver();
  } else {
    // The API might load asynchronously, listen for it to become available
    window.__onGCastApiAvailable = (isAvailable) => {
      if (isAvailable) {
        initializeCastReceiver();
      } else {
        console.error('Cast Receiver API not available');
      }
    };
  }
});

// Add global type definitions for the cast framework
declare global {
  interface Window {
    cast?: {
      framework?: {
        CastReceiverContext: {
          getInstance: () => any;
        };
        CastReceiverOptions: new () => CastReceiverOptions;
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }

  interface CastReceiverOptions {
    disableIdleTimeout?: boolean;
    customNamespaces?: Record<string, string>;
  }
}
