/// <reference types="@vitest/browser-playwright" />

// Vite worker imports for Monaco editor
declare module 'monaco-editor/esm/vs/editor/editor.worker?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/json/json.worker?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/css/css.worker?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/html/html.worker?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/typescript/ts.worker?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

// Vite raw imports for markdown files
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// React DOM types
declare module 'react-dom' {
  export * from 'react-dom';
}

declare module 'react-dom/client' {
  export * from 'react-dom/client';
}
