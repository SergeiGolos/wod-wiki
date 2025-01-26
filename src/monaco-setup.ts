import * as monaco from 'monaco-editor';

// Tell Monaco where to find worker files
self.MonacoEnvironment = {
  getWorkerUrl: function (_, label) {
    // Adjust path to match where workers are served (e.g., /_next/static/)
    return `_next/static/${label}.worker.js`;
  },
};

export function loadMonaco() {
  return monaco;
}