let monacoInstance: typeof import('monaco-editor') | null = null;

export async function initMonaco() {
  if (!monacoInstance) {
    monacoInstance = await import('monaco-editor');
    self.MonacoEnvironment = {
      getWorkerUrl: (_moduleId: string, label: string) => {
        return `/_next/static/${label}.worker.js`;
      }
    };
  }
  return monacoInstance;
}