export function configureMonaco() {
    if (typeof window !== 'undefined') {
      window.MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, label: string) {
          switch (label) {
            case 'typescript':
            case 'javascript':
              return '/_next/static/ts.worker.js';
            default:
              return '/_next/static/editor.worker.js';
          }
        }
      };
    }
  }