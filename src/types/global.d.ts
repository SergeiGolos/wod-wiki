declare global {
    interface Window {
      MonacoEnvironment: {
        getWorkerUrl: (moduleId: string, label: string) => string;
      };
    }
  }
  
  export {};