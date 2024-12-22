import * as monaco from 'monaco-editor';

// Using a more compatible way to load workers
const jsonWorkerUrl = new URL(
    'node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
    window.location.origin + '/'
).href;

const tsWorkerUrl = new URL(
    'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
    window.location.origin + '/'
).href;

const editorWorkerUrl = new URL(
    'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
    window.location.origin + '/'
).href;

// @ts-ignore
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new Worker(jsonWorkerUrl, { type: 'module' });
        }
        if (label === 'typescript' || label === 'javascript') {
            return new Worker(tsWorkerUrl, { type: 'module' });
        }
        return new Worker(editorWorkerUrl, { type: 'module' });
    }
};
